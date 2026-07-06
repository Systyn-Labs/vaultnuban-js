import { describe, expect, it, vi } from "vitest";
import { VaultNuban } from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("mfa resource", () => {
  it("attaches X-User-Session on every request when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ enabled: true, recovery_codes_remaining: 7 }));
    const vn = new VaultNuban({
      apiKey: "sk_test_123",
      userSessionToken: "usess_abc",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const status = await vn.mfa.status();

    expect(status).toEqual({ enabled: true, recovery_codes_remaining: 7 });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["X-User-Session"]).toBe("usess_abc");
  });

  it("omits X-User-Session when not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ enabled: false, recovery_codes_remaining: 0 }));
    const vn = new VaultNuban({ apiKey: "sk_test_123", fetch: fetchMock as unknown as typeof fetch });

    await vn.mfa.status();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["X-User-Session"]).toBeUndefined();
  });

  it("attaches X-Step-Up-Token only on the call that passes it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "va_1" }));
    const vn = new VaultNuban({ apiKey: "sk_test_123", fetch: fetchMock as unknown as typeof fetch });

    await vn.virtualAccounts.provision("cust_1", undefined, { stepUpToken: "stepup_xyz" });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["X-Step-Up-Token"]).toBe("stepup_xyz");
  });

  it("does not attach X-Step-Up-Token when not passed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "va_1" }));
    const vn = new VaultNuban({ apiKey: "sk_test_123", fetch: fetchMock as unknown as typeof fetch });

    await vn.virtualAccounts.provision("cust_1");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["X-Step-Up-Token"]).toBeUndefined();
  });

  it("verify() posts the code and returns a step-up token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ step_up_token: "stepup_1", expires_at: "2026-07-03T00:05:00Z" }));
    const vn = new VaultNuban({ apiKey: "sk_test_123", fetch: fetchMock as unknown as typeof fetch });

    const result = await vn.mfa.verify({ code: "123456" });

    expect(result.step_up_token).toBe("stepup_1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/v1/mfa/verify");
    expect(JSON.parse(init.body as string)).toEqual({ code: "123456" });
  });
});
