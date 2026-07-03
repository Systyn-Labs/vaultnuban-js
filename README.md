# @systynlabs/vaultnuban

Official TypeScript/Node SDK for the [VaultNUBAN](https://github.com/Systyn-Labs/vaultnuban) virtual account API. Works in Node ≥18 (plain Node, NestJS, Express, Next.js API routes).

```bash
npm install @systynlabs/vaultnuban
```

## Quick start

```ts
import { VaultNuban } from "@systynlabs/vaultnuban";

const vn = new VaultNuban({ apiKey: process.env.VAULTNUBAN_API_KEY! });

// Onboard a customer and give them a dedicated NUBAN
const customer = await vn.customers.create({
  external_ref: "user_12345",
  display_name: "Amaka Obi",
  bvn: "22345678901",
});
const va = await vn.virtualAccounts.provision(customer.id);
console.log(`Fund ${va.nuban} (${va.bank_name})`);

// Check the wallet
const balance = await vn.transactions.balance(customer.id);
console.log(balance.balance_ngn);

// Pay out
const payee = await vn.withdrawals.resolvePayee("058", "0123456789");
await vn.withdrawals.create(customer.id, {
  amount_kobo: 250_000,
  destination_bank_code: "058",
  destination_account_number: payee.account_number,
  destination_account_name: payee.account_name,
});
```

## Receiving webhooks

Register an endpoint once, then verify every delivery with the raw request
body and the `X-VaultNUBAN-Signature` header:

```ts
import express from "express";
import * as webhooks from "@systynlabs/vaultnuban/webhooks";

await vn.webhooks.createEndpoint({
  url: "https://example.com/vaultnuban/webhook",
  secret: process.env.VAULTNUBAN_WEBHOOK_SECRET!,
});

const app = express();
app.post("/vaultnuban/webhook", express.raw({ type: "*/*" }), (req, res) => {
  let event;
  try {
    event = webhooks.constructEvent(
      req.body, // raw Buffer — do not JSON-parse before verifying
      req.header("X-VaultNUBAN-Signature"),
      process.env.VAULTNUBAN_WEBHOOK_SECRET!,
    );
  } catch {
    return res.sendStatus(400);
  }

  if (event.event_type === "payment_success") {
    // credit received on event.transaction.nuban
  }
  res.sendStatus(200); // 2xx acknowledges; anything else is retried
});
```

## Behavior

- **Idempotency** — every `POST`/`PATCH`/`DELETE` automatically sends an
  `Idempotency-Key` (override via `options.idempotencyKey`). Replays within
  24 h return the cached response.
- **Retries** — 429 and 5xx responses and network failures are retried with
  exponential backoff (default 2 retries; safe because of the idempotency key).
- **Pagination** — `list()` returns one page (`{ data, next_cursor }`);
  `listAll()` returns an async iterator over every item:
  ```ts
  for await (const tx of vn.transactions.listAll({ direction: "credit" })) { … }
  ```
- **Errors** — non-2xx responses throw typed errors (`AuthenticationError`,
  `NotFoundError`, `ValidationError`, `ConflictError`, `RateLimitError`,
  `ServerError`) carrying the RFC-9457 problem body and `X-Request-ID`.

## NestJS

No separate package needed — inject the client as a provider:

```ts
@Module({
  providers: [
    {
      provide: VaultNuban,
      useFactory: () => new VaultNuban({ apiKey: process.env.VAULTNUBAN_API_KEY! }),
    },
  ],
  exports: [VaultNuban],
})
export class VaultNubanModule {}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
