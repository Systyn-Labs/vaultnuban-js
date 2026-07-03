import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { RelayEvent } from "./types.js";

/**
 * Thrown by `constructEvent` when the signature header does not match the body.
 */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/**
 * Compute the expected `X-VaultNUBAN-Signature` value for a payload.
 *
 * The signing key is the SHA-256 hex digest of the plaintext secret you
 * registered the endpoint with (VaultNUBAN never stores the plaintext):
 *
 *   signature = "sha256=" + hex(HMAC-SHA256(body, key = sha256hex(secret)))
 */
export function computeSignature(body: string | Buffer, secret: string): string {
  const key = createHash("sha256").update(secret).digest("hex");
  const mac = createHmac("sha256", key).update(body).digest("hex");
  return `sha256=${mac}`;
}

/**
 * Verify a webhook delivery. Returns true when the signature matches.
 *
 * @param body   Raw request body, exactly as received (do not re-serialize).
 * @param signature Value of the `X-VaultNUBAN-Signature` header.
 * @param secret The plaintext signing secret registered for the endpoint.
 */
export function verifySignature(
  body: string | Buffer,
  signature: string | undefined | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(computeSignature(body, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Verify and parse a webhook delivery in one call.
 *
 * ```ts
 * app.post("/vaultnuban/webhook", express.raw({ type: "*&#47;*" }), (req, res) => {
 *   const event = webhooks.constructEvent(
 *     req.body,
 *     req.header("X-VaultNUBAN-Signature"),
 *     process.env.VAULTNUBAN_WEBHOOK_SECRET!,
 *   );
 *   // event.event_type === "payment_success" etc.
 *   res.sendStatus(200);
 * });
 * ```
 *
 * @throws WebhookVerificationError when the signature is missing or invalid.
 */
export function constructEvent(
  body: string | Buffer,
  signature: string | undefined | null,
  secret: string,
): RelayEvent {
  if (!verifySignature(body, signature, secret)) {
    throw new WebhookVerificationError(
      "webhook signature verification failed — check the endpoint secret and that the raw body was passed unmodified",
    );
  }
  const text = typeof body === "string" ? body : body.toString("utf8");
  return JSON.parse(text) as RelayEvent;
}
