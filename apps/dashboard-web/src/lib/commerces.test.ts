import type { Commerce, Transaction } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import { buildCommerceRow, buildPortalSummary } from './commerces';

function commerce(overrides: Partial<Commerce>): Commerce {
  return {
    id: 'c1',
    portalId: 'p1',
    categoryId: 'cat1',
    tradeName: 'Supermercado La 14',
    legalName: 'La 14 SAS',
    taxId: '900123456-1',
    contactName: 'Gerente',
    contactEmail: 'gerente@la14.com',
    contactPhone: '+57 300 0000000',
    address: 'Calle 1',
    city: 'Neiva',
    status: 'ACTIVE',
    isPublished: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
    portalId: 'p1',
    commerceId: 'c1',
    serviceId: 's1',
    formSubmissionId: null,
    payerEmail: 'a@b.com',
    payerDocumentType: 'CC',
    payerDocumentNumber: '1',
    payerFirstName: 'A',
    payerLastName: 'B',
    payerPhone: '+57 300 0000000',
    amount: 10000,
    currency: 'COP',
    method: 'PSE',
    status: 'APPROVED',
    internalReference: 'ref',
    providerReference: null,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCommerceRow', () => {
  it('sums amounts and picks the most recent transaction date', () => {
    const row = buildCommerceRow(commerce({}), 'Comercio físico', [
      tx({ amount: 10000, createdAt: '2026-01-10T12:00:00.000Z' }),
      tx({ id: 't2', amount: 5000, createdAt: '2026-01-20T12:00:00.000Z' }),
    ]);

    expect(row.tx).toBe(2);
    expect(row.totalLabel).toBe('$15.000');
    // Noon UTC is safely within the same calendar day in America/Bogota
    // (UTC-5) — see `formatDateEs`'s docblock for why midnight UTC would
    // display as the previous day there.
    expect(row.ultimaActividad).toBe('20/01/2026');
    expect(row.categoryName).toBe('Comercio físico');
  });

  it('shows a fallback when the commerce has no transactions', () => {
    const row = buildCommerceRow(commerce({}), 'Comercio físico', []);
    expect(row.tx).toBe(0);
    expect(row.ultimaActividad).toBe('Sin actividad');
  });
});

describe('buildPortalSummary', () => {
  it('counts only active commerces and sums the given transactions', () => {
    const summary = buildPortalSummary(
      [commerce({}), commerce({ id: 'c2', status: 'INACTIVE' })],
      [tx({ amount: 10000 }), tx({ id: 't2', amount: 20000 })],
    );

    expect(summary.find((s) => s.label === 'Aliados totales')?.value).toBe('2');
    expect(summary.find((s) => s.label === 'Aliados activos')?.value).toBe('1');
    expect(summary.find((s) => s.label === 'Total procesado')?.value).toBe('$30.000');
  });
});
