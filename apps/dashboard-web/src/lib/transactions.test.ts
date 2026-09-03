import type { Transaction, TransactionAlert } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import {
  recentTransactionAlertViews,
  recentTxAlerts,
  recentTxRows,
  sortByRecent,
  toTransactionAlertView,
  toTxAlert,
  toTxRow,
} from './transactions';

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

describe('sortByRecent', () => {
  it('sorts newest first without mutating the input array', () => {
    const input = [
      tx({ id: 'aaaaaa11-0000-0000-0000-000000000000', createdAt: '2026-01-10T00:00:00.000Z' }),
      tx({ id: 'bbbbbb22-0000-0000-0000-000000000000', createdAt: '2026-01-20T00:00:00.000Z' }),
    ];
    const sorted = sortByRecent(input);

    expect(sorted.map((t) => t.id)).toEqual(['bbbbbb22-0000-0000-0000-000000000000', 'aaaaaa11-0000-0000-0000-000000000000']);
    expect(input[0]?.id).toBe('aaaaaa11-0000-0000-0000-000000000000');
  });
});

describe('toTxAlert', () => {
  it('derives an alert from a real transaction without inventing a rejection reason', () => {
    const alert = toTxAlert(tx({ status: 'REJECTED', amount: 2000 }));

    expect(alert.title).toBe('Rechazada');
    expect(alert.tone).toBe('danger');
    expect(alert.mark).toBe('✕');
    expect(alert.desc).toBe('Transacción #111111 por $2.000 — 20/01/2026.');
  });

  it('uses a distinct mark per tone', () => {
    expect(toTxAlert(tx({ status: 'APPROVED' })).mark).toBe('✓');
    expect(toTxAlert(tx({ status: 'PENDING' })).mark).toBe('•');
  });
});

describe('recentTxAlerts', () => {
  it('sorts by createdAt descending and slices to the limit', () => {
    const alerts = recentTxAlerts(
      [
        tx({ id: 'aaaaaa11-0000-0000-0000-000000000000', createdAt: '2026-01-10T00:00:00.000Z' }),
        tx({ id: 'bbbbbb22-0000-0000-0000-000000000000', createdAt: '2026-01-20T00:00:00.000Z' }),
      ],
      1,
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.id).toBe('#BBBBBB');
  });
});

function txAlert(overrides: Partial<TransactionAlert>): TransactionAlert {
  return { ...tx({}), isRead: false, ...overrides };
}

describe('toTransactionAlertView', () => {
  it('carries the real transaction id (transactionId) separately from the shortened display id, plus the real isRead', () => {
    const view = toTransactionAlertView(txAlert({ isRead: true }));

    expect(view.transactionId).toBe('11111111-1111-1111-1111-111111111111');
    expect(view.id).toBe('#111111');
    expect(view.isRead).toBe(true);
  });
});

describe('recentTransactionAlertViews', () => {
  it('sorts by createdAt descending, slices to the limit, and keeps each isRead', () => {
    const views = recentTransactionAlertViews(
      [
        txAlert({ id: 'aaaaaa11-0000-0000-0000-000000000000', createdAt: '2026-01-10T00:00:00.000Z', isRead: true }),
        txAlert({ id: 'bbbbbb22-0000-0000-0000-000000000000', createdAt: '2026-01-20T00:00:00.000Z', isRead: false }),
      ],
      1,
    );

    expect(views).toHaveLength(1);
    expect(views[0]?.transactionId).toBe('bbbbbb22-0000-0000-0000-000000000000');
    expect(views[0]?.isRead).toBe(false);
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
