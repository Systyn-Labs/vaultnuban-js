import { HttpClient, type ClientOptions } from "./client.js";
import {
  APIKeys,
  Audit,
  Collections,
  Customers,
  Suspense,
  Transactions,
  VirtualAccounts,
  Webhooks,
  Withdrawals,
} from "./resources.js";

/**
 * VaultNUBAN API client.
 *
 * ```ts
 * import { VaultNuban } from "@systynlabs/vaultnuban";
 *
 * const vn = new VaultNuban({ apiKey: process.env.VAULTNUBAN_API_KEY! });
 *
 * const customer = await vn.customers.create({
 *   external_ref: "user_12345",
 *   display_name: "Amaka Obi",
 *   bvn: "22345678901",
 * });
 * const va = await vn.virtualAccounts.provision(customer.id);
 * console.log(va.nuban, va.bank_name);
 * ```
 */
export class VaultNuban {
  readonly http: HttpClient;

  readonly customers: Customers;
  readonly virtualAccounts: VirtualAccounts;
  readonly transactions: Transactions;
  readonly withdrawals: Withdrawals;
  readonly collections: Collections;
  readonly suspense: Suspense;
  readonly webhooks: Webhooks;
  readonly apiKeys: APIKeys;
  readonly audit: Audit;

  constructor(options: ClientOptions) {
    this.http = new HttpClient(options);
    this.customers = new Customers(this.http);
    this.virtualAccounts = new VirtualAccounts(this.http);
    this.transactions = new Transactions(this.http);
    this.withdrawals = new Withdrawals(this.http);
    this.collections = new Collections(this.http);
    this.suspense = new Suspense(this.http);
    this.webhooks = new Webhooks(this.http);
    this.apiKeys = new APIKeys(this.http);
    this.audit = new Audit(this.http);
  }
}

// Webhook signature helpers use node:crypto and live in the Node-only
// subpath export: `import { constructEvent } from "@systynlabs/vaultnuban/webhooks"`.
// This keeps the main entry browser-safe.

export { HttpClient } from "./client.js";
export type { ClientOptions, RequestOptions } from "./client.js";
export * from "./errors.js";
export * from "./types.js";
