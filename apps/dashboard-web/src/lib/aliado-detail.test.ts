import type { Commerce, Transaction } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildDonutGradient,
  buildInfoFields,
  buildMetodosBreakdown,
  buildPerformanceBars,
  buildResumenStats,
} from './aliado-detail';

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
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('buildResumenStats', () => {
  it('groups real statuses instead of the mock’s fabricated fixed percentages', () => {
    const stats = buildResumenStats([
      tx({ status: 'APPROVED' }),
      tx({ status: 'PENDING' }),
      tx({ status: 'PROCESSING' }),
      tx({ status: 'REJECTED' }),
      tx({ status: 'CANCELLED' }),
    ]);

    expect(stats.find((s) => s.label === 'Transacciones')?.value).toBe('5');
    expect(stats.find((s) => s.label === 'Aprobadas')?.value).toBe('1');
    expect(stats.find((s) => s.label === 'Pendientes')?.value).toBe('2');
    expect(stats.find((s) => s.label === 'Rechazadas')?.value).toBe('1');
    expect(stats.find((s) => s.label === 'Canceladas')?.value).toBe('1');
  });
});

describe('buildPerformanceBars', () => {
  it('returns 8 empty bars when there are no transactions', () => {
    const bars = buildPerformanceBars([]);
    expect(bars).toHaveLength(8);
    expect(bars.every((b) => b.pct === 0)).toBe(true);
  });

  it('puts the largest bucket at 100% and spans the observed date range', () => {
    const bars = buildPerformanceBars([
      tx({ amount: 1000, createdAt: '2026-01-01T00:00:00.000Z' }),
      tx({ amount: 5000, createdAt: '2026-01-29T00:00:00.000Z' }),
    ]);
    expect(Math.max(...bars.map((b) => b.pct))).toBe(100);
  });
});

describe('buildMetodosBreakdown', () => {
  it('computes a real percentage split and drops methods with zero transactions', () => {
    const breakdown = buildMetodosBreakdown([tx({ method: 'PSE' }), tx({ method: 'PSE' }), tx({ method: 'CARD' })]);

    expect(breakdown).toHaveLength(2);
    expect(breakdown.find((m) => m.method === 'PSE')?.pct).toBe(67);
    expect(breakdown.find((m) => m.method === 'DIGITAL_WALLET')).toBeUndefined();
  });
});

describe('buildDonutGradient', () => {
  it('builds contiguous conic-gradient stops covering 0–100%', () => {
    const gradient = buildDonutGradient([
      { method: 'PSE', label: 'PSE', count: 1, pct: 60, tone: 'accent' },
      { method: 'CARD', label: 'Tarjeta', count: 1, pct: 40, tone: 'orange' },
    ]);
    expect(gradient).toBe('conic-gradient(var(--color-accent) 0% 60%, var(--color-orange) 60% 100%)');
  });
});

describe('buildInfoFields', () => {
  it('surfaces only real Commerce fields (no fabricated "Estado de integración")', () => {
    const commerce: Commerce = {
      id: 'c1',
      portalId: 'p1',
      categoryId: 'cat1',
      tradeName: 'Supermercado La 14',
      legalName: 'La 14 SAS',
      taxId: '900123456-1',
      contactName: 'Laura Gómez',
      contactEmail: 'laura@la14.com',
      contactPhone: '+57 315 1234567',
      address: 'Calle 10',
      city: 'Neiva',
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2024-03-01T00:00:00.000Z',
      updatedAt: '2024-03-01T00:00:00.000Z',
    };

    const fields = buildInfoFields(commerce, 'Comercio físico');

    expect(fields.find((f) => f.label === 'Nombre de contacto')?.value).toBe('Laura Gómez');
    expect(fields.some((f) => f.label === 'Estado de integración')).toBe(false);
  });
});
