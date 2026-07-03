import { ConnectionError, errorFromResponse, type ProblemDetails } from "./errors.js";
import type { Page } from "./types.js";

export interface ClientOptions {
  /** Tenant API key (`sk_…`). */
  apiKey: string;
  /** API origin. Defaults to https://vaultnuban.onrender.com */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 30_000. */
  timeoutMs?: number;
  /** Max automatic retries on 429/5xx/network errors. Default 2. */
  maxRetries?: number;
  /** Custom fetch implementation (for testing or polyfills). */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  /**
   * Idempotency key for mutating requests. When omitted on POST/PATCH/DELETE,
   * one is generated automatically so retries are always safe.
   */
  idempotencyKey?: string;
  /** Override the client-level timeout for this call. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Low-level HTTP core shared by all resource groups. */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) throw new Error("vaultnuban: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://vaultnuban.onrender.com").replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 2;
    // Bind to globalThis: browsers throw "Illegal invocation" when fetch is
    // called detached from its original receiver.
    this.fetchFn = opts.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  }

  async request<T>(
    method: string,
    path: string,
    opts: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      options?: RequestOptions;
    } = {},
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (MUTATING.has(method)) {
      // globalThis.crypto is available in Node ≥19, all browsers, and workers;
      // keeps this module runtime-agnostic (no node: imports).
      headers["Idempotency-Key"] = opts.options?.idempotencyKey ?? globalThis.crypto.randomUUID();
    }

    const timeoutMs = opts.options?.timeoutMs ?? this.timeoutMs;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(Math.min(500 * 2 ** (attempt - 1), 4_000) + Math.random() * 250);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (opts.options?.signal) {
        opts.options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      let resp: Response;
      try {
        resp = await this.fetchFn(url, {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        lastErr = new ConnectionError(`request to ${url.pathname} failed: ${String(err)}`, err);
        continue; // network errors are retryable; the Idempotency-Key makes mutations safe
      }
      clearTimeout(timer);

      if (resp.ok) {
        if (resp.status === 204) return undefined as T;
        return (await resp.json()) as T;
      }

      const requestId = resp.headers.get("X-Request-ID") ?? undefined;
      const problem = await parseProblem(resp);
      const error = errorFromResponse(resp.status, problem, requestId);

      if ((resp.status === 429 || resp.status >= 500) && attempt < this.maxRetries) {
        lastErr = error;
        continue;
      }
      throw error;
    }

    throw lastErr instanceof Error
      ? lastErr
      : new ConnectionError("request failed after retries", lastErr);
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>, options?: RequestOptions) {
    return this.request<T>("GET", path, { query, options });
  }
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("POST", path, { body, options });
  }
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("PATCH", path, { body, options });
  }
  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>("DELETE", path, { options });
  }

  /**
   * Auto-paginate a cursor-paginated list endpoint.
   *
   * ```ts
   * for await (const va of client.http.paginate<VirtualAccount>("/v1/virtual-accounts")) { … }
   * ```
   */
  async *paginate<T>(
    path: string,
    query: Record<string, string | number | undefined> = {},
  ): AsyncGenerator<T, void, undefined> {
    let cursor: string | undefined = query.cursor as string | undefined;
    do {
      const page: Page<T> = await this.get<Page<T>>(path, { ...query, cursor });
      for (const item of page.data ?? []) yield item;
      cursor = page.next_cursor;
    } while (cursor);
  }
}

async function parseProblem(resp: Response): Promise<ProblemDetails> {
  try {
    const body = (await resp.json()) as Partial<ProblemDetails>;
    return {
      type: body.type ?? "about:blank",
      title: body.title ?? resp.statusText,
      status: body.status ?? resp.status,
      detail: body.detail,
      instance: body.instance,
    };
  } catch {
    return { type: "about:blank", title: resp.statusText || "Error", status: resp.status };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
