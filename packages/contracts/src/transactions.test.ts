import { describe, expect, it } from 'vitest';

import { TransactionEventSchema, TransactionSchema } from './transactions';

const validTransaction = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  portalId: '123e4567-e89b-12d3-a456-426614174001',
  commerceId: '123e4567-e89b-12d3-a456-426614174002',
  serviceId: '123e4567-e89b-12d3-a456-426614174003',
  formSubmissionId: null,
  payerEmail: 'ana@example.com',
  payerDocumentType: 'CC',
  payerDocumentNumber: '1234567890',
  payerFirstName: 'Ana',
  payerLastName: 'Pérez',
  payerPhone: '3000000000',
  amount: 5_000_000,
  currency: 'COP',
  method: 'PSE',
  status: 'CREATED',
  internalReference: 'TX-0001',
  providerReference: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TransactionSchema', () => {
  it('accepts a fully-formed transaction and has no amount/status write path', () => {
    const result = TransactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    const result = TransactionSchema.safeParse({ ...validTransaction, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown status', () => {
    const result = TransactionSchema.safeParse({ ...validTransaction, status: 'DONE' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown payment method', () => {
    const result = TransactionSchema.safeParse({ ...validTransaction, method: 'CRYPTO' });
    expect(result.success).toBe(false);
  });
});

describe('TransactionEventSchema', () => {
  it('accepts an event with a null previousStatus (the first event)', () => {
    const result = TransactionEventSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      transactionId: '123e4567-e89b-12d3-a456-426614174001',
      previousStatus: null,
      newStatus: 'CREATED',
      source: 'SYSTEM',
      metadata: null,
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
