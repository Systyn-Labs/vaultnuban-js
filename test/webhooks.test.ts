import { describe, expect, it } from "vitest";
import { computeSignature, constructEvent, verifySignature, WebhookVerificationError } from "../src/webhooks.js";

const secret = "whsec_test_secret";
const body = JSON.stringify({
  event_type: "payment_success",
  occurred_at: "2026-07-01T20:41:56Z",
  transaction: {
    id: "API-VACT_TRA-94676-cbc17262",
    amount_kobo: 10000,
    nuban: "7053527054",
    occurred_at: "2026-07-01T20:41:56Z",
    sender_name: "FAVOUR CHIDERA MAX-OTI",
    sender_bank: "GTBank",
    narration: "test",
  },
});

describe("webhook signature", () => {
  it("round-trips compute → verify", () => {
    const sig = computeSignature(body, secret);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it("matches the server's known-answer vector", () => {
    // Golden value produced by the Go server's sign() for body="hello" secret="s3cret"
    // (HMAC key = sha256hex("s3cret")).
    expect(computeSignature("hello", "s3cret")).toBe(
      "sha256=87471d77c71a5ad39e7db0fd51926cc5bd618881f379fc3ff1bb3d3657257957",
    );
  });

  it("rejects a tampered body", () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body + " ", sig, secret)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body, sig, "other")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifySignature(body, undefined, secret)).toBe(false);
  });

  it("constructEvent parses on success and throws on failure", () => {
    const sig = computeSignature(body, secret);
    const event = constructEvent(body, sig, secret);
    expect(event.event_type).toBe("payment_success");
    expect(event.transaction.nuban).toBe("7053527054");

    expect(() => constructEvent(body, "sha256=deadbeef", secret)).toThrow(WebhookVerificationError);
  });
});
