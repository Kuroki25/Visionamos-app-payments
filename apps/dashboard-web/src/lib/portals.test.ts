import type { Commerce, Portal, Transaction } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import { buildPortalHeaderStats, buildPortalRows } from './portals';

function portal(overrides: Partial<Portal>): Portal {
  return {
    id: 'p1',
    name: 'Otrahuilca',
    status: 'ACTIVE',
    isPublished: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildPortalRows', () => {
  it('computes real aliados/tx counts instead of fields the Portal entity does not have', () => {
    const portals = [portal({}), portal({ id: 'p2', name: 'Avanza', status: 'INACTIVE' })];
    const commercesByPortal = new Map([['p1', [commerce({})]], ['p2', []]]);
    const transactions = [tx({ portalId: 'p1' }), tx({ portalId: 'p1', id: 't2' }), tx({ portalId: 'p2', id: 't3' })];

    const rows = buildPortalRows(portals, commercesByPortal, transactions);

    expect(rows[0]).toMatchObject({ id: 'p1', comercios: 1, tx: 2, estadoLabel: 'Activo', estadoTone: 'success' });
    expect(rows[1]).toMatchObject({ id: 'p2', comercios: 0, tx: 1, estadoLabel: 'Inactivo', estadoTone: 'danger' });
  });
});

describe('buildPortalHeaderStats', () => {
  it('sums aliados and processed amount only for transactions scoped to the given portals', () => {
    const portals = [portal({})];
    const commercesByPortal = new Map([['p1', [commerce({}), commerce({ id: 'c2' })]]]);
    const transactions = [tx({ amount: 10000 }), tx({ id: 't2', amount: 5000 }), tx({ id: 't3', portalId: 'other', amount: 999999 })];

    const stats = buildPortalHeaderStats(portals, commercesByPortal, transactions);

    expect(stats.find((s) => s.label === 'Total de portales')?.value).toBe('1');
    expect(stats.find((s) => s.label === 'Total de aliados')?.value).toBe('2');
    expect(stats.find((s) => s.label === 'Transacciones')?.value).toBe('2');
    expect(stats.find((s) => s.label === 'Total procesado')?.value).toBe('$15.000');
  });
});
