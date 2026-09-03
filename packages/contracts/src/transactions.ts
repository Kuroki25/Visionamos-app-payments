import { z } from 'zod';

/**
 * docs/payments/TRANSACTION_LIFECYCLE.md §2/§5 — the confirmed candidate
 * state set. `EXPIRED`/`UNKNOWN`/`REQUIRES_ACTION` are explicitly "solo si
 * los proveedores/negocio lo requieren" — not added until a real provider
 * integration needs them (docs/adr/012).
 */
export const TransactionStatusSchema = z.enum([
  'CREATED',
  'PENDING',
  'PROCESSING',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §10.3 — confirmed
 * conceptually. A flat enum, not a table: the enablement hierarchy
 * (global/portal/commerce/service) is explicitly pending
 * (docs/adr/012 — BR-030).
 */
export const PaymentMethodSchema = z.enum(['CASH', 'CARD', 'PSE', 'DIGITAL_WALLET']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * docs/payments/TRANSACTION_LIFECYCLE.md §7 — append-only history. Where a
 * status change came from; only SYSTEM is producible in this phase (no
 * provider/webhook integration exists yet), the rest are reserved so a
 * future migration isn't needed to add them.
 */
export const TransactionEventSourceSchema = z.enum([
  'SYSTEM',
  'PAYMENT_PROVIDER',
  'WEBHOOK',
  'ADMINISTRATIVE_CORRECTION',
  'RECONCILIATION',
]);
export type TransactionEventSource = z.infer<typeof TransactionEventSourceSchema>;

export const TransactionEventSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  previousStatus: TransactionStatusSchema.nullable(),
  newStatus: TransactionStatusSchema,
  source: TransactionEventSourceSchema,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  occurredAt: z.iso.datetime(),
});
export type TransactionEvent = z.infer<typeof TransactionEventSchema>;

/**
 * Read-only shape — there is no `CreateTransactionSchema`/`UpdateTransactionSchema`
 * exported here on purpose. No admin endpoint creates or edits a
 * Transaction (docs/adr/012 — docs/business/ROLE_PERMISSION_MATRIX.md §5.8
 * confirms "Crear manualmente: ❌" / "Editar monto original: ❌" for every
 * role, no exception). `TransactionsService.create()` exists internally for
 * the future public payment flow to call — its input isn't a wire contract
 * yet, because that flow doesn't exist.
 */
export const TransactionSchema = z.object({
  id: z.uuid(),
  portalId: z.uuid(),
  commerceId: z.uuid(),
  serviceId: z.uuid(),
  formSubmissionId: z.uuid().nullable(),
  payerEmail: z.email(),
  payerDocumentType: z.string(),
  payerDocumentNumber: z.string(),
  payerFirstName: z.string(),
  payerLastName: z.string(),
  payerPhone: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  method: PaymentMethodSchema,
  status: TransactionStatusSchema,
  internalReference: z.string(),
  providerReference: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * `GET /transactions/alerts` — the same scope-filtered transactions
 * `GET /transactions` returns, each annotated with whether the *current*
 * actor has marked it read (`transaction_alert_reads`, one row per
 * (user, transaction) — docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.4).
 * `isRead` is per-viewer, not a property of the Transaction itself, which
 * is why it lives on this separate response shape and not on
 * `TransactionSchema`.
 */
export const TransactionAlertSchema = TransactionSchema.extend({
  isRead: z.boolean(),
});
export type TransactionAlert = z.infer<typeof TransactionAlertSchema>;

/**
 * Body of `POST /transactions/alerts/read-all`. The server re-validates
 * every id against the actor's real scope before recording anything — a
 * client-supplied id outside that scope is silently dropped, never used to
 * probe or mark state for a transaction the actor can't see (OWASP API1,
 * Broken Object Level Authorization).
 */
export const MarkAlertsReadSchema = z.object({
  transactionIds: z.array(z.uuid()).min(1),
});
export type MarkAlertsRead = z.infer<typeof MarkAlertsReadSchema>;
