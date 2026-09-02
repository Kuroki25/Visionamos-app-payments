import type { Transaction } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import { recentTxRows, toTxRow } from './map-transaction';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    portalId: 'p1',
    commerceId: 'c1',
    serviceId: 's1',
    formSubmissionId: null,
    payerEmail: 'payer@example.com',
    payerDocumentType: 'CC',
    payerDocumentNumber: '123',
    payerFirstName: 'Jane',
    payerLastName: 'Doe',
    payerPhone: '+57 300 0000000',
    amount: 20000,
    currency: 'COP',
    method: 'PSE',
    status: 'APPROVED',
    internalReference: 'ref-1',
    providerReference: null,
    createdAt: '2026-01-20T16:22:33.000Z',
    updatedAt: '2026-01-20T16:22:33.000Z',
    ...overrides,
  };
}

describe('toTxRow', () => {
  it('maps a real Transaction into the TxTable view model', () => {
    const row = toTxRow(tx({}));

    expect(row.id).toBe('#111111');
    expect(row.fecha).toBe('20/01/2026');
    expect(row.metodo).toBe('PSE');
    expect(row.monto).toBe('$20.000');
    expect(row.estadoLabel).toBe('Aprobada');
    expect(row.estadoTone).toBe('success');
  });

  it('maps every real TransactionStatus to a Spanish label and tone (not just the 3 the mock had)', () => {
    expect(toTxRow(tx({ status: 'REJECTED' })).estadoTone).toBe('danger');
    expect(toTxRow(tx({ status: 'FAILED' })).estadoTone).toBe('danger');
    expect(toTxRow(tx({ status: 'PENDING' })).estadoTone).toBe('accent');
    expect(toTxRow(tx({ status: 'CANCELLED' })).estadoLabel).toBe('Cancelada');
  });
});

describe('recentTxRows', () => {
  it('sorts by createdAt descending and slices to the limit', () => {
    const rows = recentTxRows(
      [
        tx({ id: 'aaaaaa11-0000-0000-0000-000000000000', createdAt: '2026-01-10T00:00:00.000Z' }),
        tx({ id: 'bbbbbb22-0000-0000-0000-000000000000', createdAt: '2026-01-20T00:00:00.000Z' }),
        tx({ id: 'cccccc33-0000-0000-0000-000000000000', createdAt: '2026-01-15T00:00:00.000Z' }),
      ],
      2,
    );

    expect(rows.map((r) => r.id)).toEqual(['#BBBBBB', '#CCCCCC']);
  });
});
