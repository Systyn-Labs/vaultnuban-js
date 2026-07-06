import type { HttpClient, RequestOptions } from "./client.js";
import type {
  APIKey,
  AuditEntry,
  Balance,
  Collection,
  CreateCollectionParams,
  CreateCustomerParams,
  CreateWebhookEndpointParams,
  CreateWithdrawalParams,
  Customer,
  ListParams,
  MFASetupResponse,
  MFAStatus,
  MFAVerifyResponse,
  Page,
  PayeeResolution,
  ProvisionVAParams,
  RegenerateRecoveryCodesResponse,
  ResolveSuspenseParams,
  Statement,
  SuspenseItem,
  Transaction,
  VerifyMFAParams,
  VirtualAccount,
  VirtualAccountListItem,
  WebhookDelivery,
  WebhookEndpoint,
  Withdrawal,
} from "./types.js";

export class Customers {
  constructor(private readonly http: HttpClient) {}

  create(params: CreateCustomerParams, options?: RequestOptions): Promise<Customer> {
    return this.http.post("/v1/customers", params, options);
  }

  list(params?: ListParams): Promise<Page<Customer>> {
    return this.http.get("/v1/customers", { ...params });
  }

  listAll(params?: Omit<ListParams, "cursor">): AsyncGenerator<Customer> {
    return this.http.paginate("/v1/customers", { ...params });
  }

  updateKycTier(customerId: string, kycTier: 1 | 2 | 3, options?: RequestOptions): Promise<Customer> {
    return this.http.patch(`/v1/customers/${customerId}/identity`, { kyc_tier: kycTier }, options);
  }
}

export class VirtualAccounts {
  constructor(private readonly http: HttpClient) {}

  /** Provision a dedicated NUBAN for a customer. */
  provision(customerId: string, params?: ProvisionVAParams, options?: RequestOptions): Promise<VirtualAccount> {
    return this.http.post(`/v1/customers/${customerId}/virtual-account`, params ?? {}, options);
  }

  get(customerId: string): Promise<VirtualAccount> {
    return this.http.get(`/v1/customers/${customerId}/virtual-account`);
  }

  /** Rename, suspend, or unsuspend the customer's virtual account. */
  update(
    customerId: string,
    params: { account_name?: string; status?: "ACTIVE" | "SUSPENDED" },
    options?: RequestOptions,
  ): Promise<VirtualAccount> {
    return this.http.patch(`/v1/customers/${customerId}/virtual-account`, params, options);
  }

  /** Close the customer's virtual account. Irreversible. */
  close(customerId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/customers/${customerId}/virtual-account`, options);
  }

  /** Tenant-wide flat listing across all customers. */
  list(params?: ListParams): Promise<Page<VirtualAccountListItem>> {
    return this.http.get("/v1/virtual-accounts", { ...params });
  }

  listAll(params?: Omit<ListParams, "cursor">): AsyncGenerator<VirtualAccountListItem> {
    return this.http.paginate("/v1/virtual-accounts", { ...params });
  }
}

export interface TransactionListParams extends ListParams {
  from?: string;
  to?: string;
  direction?: "credit" | "debit";
}

export class Transactions {
  constructor(private readonly http: HttpClient) {}

  /** Tenant-wide flat listing. */
  list(params?: TransactionListParams): Promise<Page<Transaction>> {
    return this.http.get("/v1/transactions", { ...params });
  }

  listAll(params?: Omit<TransactionListParams, "cursor">): AsyncGenerator<Transaction> {
    return this.http.paginate("/v1/transactions", { ...params });
  }

  get(transactionId: string): Promise<Transaction> {
    return this.http.get(`/v1/transactions/${transactionId}`);
  }

  listForCustomer(customerId: string, params?: TransactionListParams): Promise<Page<Transaction>> {
    return this.http.get(`/v1/customers/${customerId}/transactions`, { ...params });
  }

  statement(customerId: string, params?: { from?: string; to?: string }): Promise<Statement> {
    return this.http.get(`/v1/customers/${customerId}/statement`, { ...params });
  }

  balance(customerId: string): Promise<Balance> {
    return this.http.get(`/v1/customers/${customerId}/balance`);
  }
}

export class Withdrawals {
  constructor(private readonly http: HttpClient) {}

  /**
   * Initiate an outbound transfer from the customer's wallet.
   * Pass `options.idempotencyKey` to make retries safe against double-spend;
   * one is generated automatically when omitted.
   */
  create(customerId: string, params: CreateWithdrawalParams, options?: RequestOptions): Promise<Withdrawal> {
    return this.http.post(`/v1/customers/${customerId}/withdrawals`, params, options);
  }

  list(customerId: string, params?: ListParams): Promise<Page<Withdrawal>> {
    return this.http.get(`/v1/customers/${customerId}/withdrawals`, { ...params });
  }

  /** Resolve a destination account name before initiating a withdrawal. */
  resolvePayee(bankCode: string, accountNumber: string): Promise<PayeeResolution> {
    return this.http.get("/v1/payees/resolve", {
      bank_code: bankCode,
      account_number: accountNumber,
    });
  }
}

export class Collections {
  constructor(private readonly http: HttpClient) {}

  create(customerId: string, params: CreateCollectionParams, options?: RequestOptions): Promise<Collection> {
    return this.http.post(`/v1/customers/${customerId}/collections`, params, options);
  }

  list(customerId: string, params?: ListParams): Promise<Page<Collection>> {
    return this.http.get(`/v1/customers/${customerId}/collections`, { ...params });
  }

  get(customerId: string, collectionId: string): Promise<Collection> {
    return this.http.get(`/v1/customers/${customerId}/collections/${collectionId}`);
  }

  cancel(customerId: string, collectionId: string, options?: RequestOptions): Promise<Collection> {
    return this.http.delete(`/v1/customers/${customerId}/collections/${collectionId}`, options);
  }
}

export class Suspense {
  constructor(private readonly http: HttpClient) {}

  list(params?: ListParams & { status?: "open" | "reassigned" | "refund_flagged" }): Promise<Page<SuspenseItem>> {
    return this.http.get("/v1/suspense", { ...params });
  }

  resolve(itemId: string, params: ResolveSuspenseParams, options?: RequestOptions): Promise<SuspenseItem> {
    return this.http.patch(`/v1/suspense/${itemId}`, params, options);
  }
}

export class Webhooks {
  constructor(private readonly http: HttpClient) {}

  createEndpoint(params: CreateWebhookEndpointParams, options?: RequestOptions): Promise<WebhookEndpoint> {
    return this.http.post("/v1/webhook-endpoints", params, options);
  }

  listEndpoints(): Promise<Page<WebhookEndpoint>> {
    return this.http.get("/v1/webhook-endpoints");
  }

  listDeliveries(params?: ListParams): Promise<Page<WebhookDelivery>> {
    return this.http.get("/v1/webhook-deliveries", { ...params });
  }

  replayDelivery(deliveryId: string, options?: RequestOptions): Promise<WebhookDelivery> {
    return this.http.post(`/v1/webhook-deliveries/${deliveryId}/replays`, undefined, options);
  }
}

export class APIKeys {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<Page<APIKey>> {
    return this.http.get("/v1/api-keys");
  }

  /** The returned `key` is shown once — store it immediately. */
  create(options?: RequestOptions): Promise<APIKey> {
    return this.http.post("/v1/api-keys", undefined, options);
  }

  revoke(keyId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/api-keys/${keyId}`, options);
  }
}

export class MFA {
  constructor(private readonly http: HttpClient) {}

  /** Current enrollment status for the logged-in user. */
  status(): Promise<MFAStatus> {
    return this.http.get("/v1/mfa/status");
  }

  /** Begin enrollment: generates a pending TOTP secret and 10 recovery codes. */
  setup(): Promise<MFASetupResponse> {
    return this.http.post("/v1/mfa/setup");
  }

  /** Confirm enrollment with a live TOTP code. */
  enable(params: VerifyMFAParams): Promise<{ enabled: boolean }> {
    return this.http.post("/v1/mfa/enable", params);
  }

  /**
   * Verify a live TOTP code or recovery code and mint a short-lived step-up
   * token. Pass the returned `step_up_token` as `options.stepUpToken` on the
   * mutating call it authorizes.
   */
  verify(params: VerifyMFAParams): Promise<MFAVerifyResponse> {
    return this.http.post("/v1/mfa/verify", params);
  }

  /** Requires a live TOTP code (not a recovery code) to prevent chain-minting. */
  regenerateRecoveryCodes(params: VerifyMFAParams): Promise<RegenerateRecoveryCodesResponse> {
    return this.http.post("/v1/mfa/recovery-codes/regenerate", params);
  }
}

export class Audit {
  constructor(private readonly http: HttpClient) {}

  list(params?: ListParams): Promise<Page<AuditEntry>> {
    return this.http.get("/v1/audit", { ...params });
  }

  listAll(params?: Omit<ListParams, "cursor">): AsyncGenerator<AuditEntry> {
    return this.http.paginate("/v1/audit", { ...params });
  }
}
