// API resource types, mirroring docs/openapi.yaml (components.schemas).

export interface Identity {
  id: string;
  bvn_masked: string | null;
  nin_masked: string | null;
  kyc_tier: 1 | 2 | 3;
  verification_status: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  external_ref: string;
  display_name: string;
  status: "active" | "inactive";
  identity?: Identity;
  created_at: string;
}

export type VirtualAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface VirtualAccount {
  id: string;
  customer_id: string;
  /** 10-digit Nigerian bank account number assigned by Nomba */
  nuban: string;
  bank_name: string;
  account_name: string;
  account_ref: string;
  status: VirtualAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface VirtualAccountListItem extends VirtualAccount {
  customer_display_name?: string;
}

export interface Transaction {
  id: string;
  nuban?: string;
  session_id: string | null;
  amount_kobo: number;
  /** Human-readable amount in naira, e.g. "5000.00" */
  amount_ngn: string;
  direction: "credit" | "debit";
  source: "webhook" | "sweep";
  status: "posted" | "reversed" | "pending";
  sender_name: string | null;
  sender_bank: string | null;
  narration: string | null;
  occurred_at: string;
}

export interface StatementEntry {
  occurred_at: string;
  description: string;
  debit_kobo: number;
  credit_kobo: number;
  debit_ngn: string;
  credit_ngn: string;
  running_balance_kobo: number;
  running_balance_ngn: string;
}

export interface Statement {
  customer_id: string;
  from: string;
  to: string;
  opening_balance_kobo: number;
  opening_balance_ngn: string;
  closing_balance_kobo: number;
  closing_balance_ngn: string;
  entries: StatementEntry[];
}

export interface Balance {
  customer_id: string;
  balance_kobo: number;
  balance_ngn: string;
  kyc_tier: number;
  computed_at: string;
}

export type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";

export interface Withdrawal {
  id: string;
  customer_id: string;
  amount_kobo: number;
  destination_bank_code: string;
  destination_account_number: string;
  destination_account_name: string;
  narration?: string;
  status: WithdrawalStatus;
  provider_transaction_id?: string;
  failure_reason?: string;
  created_at: string;
}

export interface PayeeResolution {
  account_name: string;
  account_number: string;
  bank_code: string;
}

export type CollectionStatus = "open" | "fulfilled" | "expired" | "cancelled";

export interface Collection {
  id: string;
  customer_id: string;
  reference: string;
  description: string;
  status: CollectionStatus;
  nuban: string;
  bank_name: string;
  expected_amount_kobo?: number;
  expires_at?: string;
  fulfilled_by_txn_id?: string;
  fulfilled_at?: string;
  created_at: string;
}

export type SuspenseReason =
  | "unmatched"
  | "closed_account"
  | "suspended_account"
  | "amount_mismatch"
  | "tier_limit";

export interface SuspenseItem {
  id: string;
  transaction_id: string;
  reason: SuspenseReason;
  status: "open" | "reassigned" | "refund_flagged";
  notes: string | null;
  resolved_by: string | null;
  amount_kobo: number;
  nuban?: string;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  attempt: number;
  status: "pending" | "delivered" | "failed" | "dead_letter";
  status_code: number | null;
  error: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  /** `key:<prefix>` for API-key-initiated actions, or `system` */
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  at: string;
}

export interface APIKey {
  id: string;
  prefix: string;
  created_at: string;
  revoked_at?: string | null;
  /** Present only in the create response — store it; it is never shown again. */
  key?: string;
}

// ── Webhook relay event (what VaultNUBAN POSTs to your endpoint) ──────────────

export interface RelayTransaction {
  id: string;
  amount_kobo: number;
  nuban: string;
  occurred_at: string;
  sender_name: string;
  sender_bank: string;
  narration: string;
}

export interface RelayEvent {
  event_type: string;
  occurred_at: string;
  transaction: RelayTransaction;
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface CreateCustomerParams {
  external_ref: string;
  display_name: string;
  bvn?: string;
  nin?: string;
}

export interface ProvisionVAParams {
  /** Optional preferred account name override */
  account_name?: string;
}

export interface CreateWithdrawalParams {
  amount_kobo: number;
  destination_bank_code: string;
  destination_account_number: string;
  destination_account_name: string;
  narration?: string;
}

export interface CreateCollectionParams {
  reference: string;
  description: string;
  expected_amount_kobo?: number;
  expires_at?: string;
}

export interface ResolveSuspenseParams {
  resolution: "reassign" | "refund_flagged";
  /** Required when resolution is "reassign". */
  target_customer_id?: string;
  notes?: string;
}

export interface CreateWebhookEndpointParams {
  url: string;
  /** Plaintext signing secret; used to verify X-VaultNUBAN-Signature */
  secret: string;
}

// ── List envelopes ────────────────────────────────────────────────────────────

export interface Page<T> {
  data: T[];
  next_cursor?: string;
}

export interface ListParams {
  cursor?: string;
  limit?: number;
}
