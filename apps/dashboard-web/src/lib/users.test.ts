import type { Commerce, Portal, User } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

import { buildRoleCounts, buildUserRow } from './users';

function user(overrides: Partial<User>): User {
  return {
    id: 'u1',
    email: 'ana@example.com',
    fullName: 'Ana Martínez',
    role: 'VIEWER',
    scopeType: 'GLOBAL',
    scopePortalId: null,
    scopeCommerceId: null,
    status: 'ACTIVE',
    createdAt: '2026-01-20T00:00:00.000Z',
    ...overrides,
  };
}

const portal: Portal = {
  id: 'p1',
  name: 'Otrahuilca',
  displayName: null,
  serviceType: null,
  description: null,
  logoUrl: null,
  status: 'ACTIVE',
  isPublished: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const commerce: Commerce = {
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
};

describe('buildUserRow', () => {
  const portalsById = new Map([[portal.id, portal]]);
  const commercesById = new Map([[commerce.id, commerce]]);

  it('resolves a GLOBAL scope to a fixed label', () => {
    const row = buildUserRow(user({}), portalsById, commercesById);
    expect(row.scopeLabel).toBe('Alcance global');
    expect(row.initials).toBe('AM');
  });

  it('resolves a PORTAL scope to the real portal name', () => {
    const row = buildUserRow(user({ scopeType: 'PORTAL', scopePortalId: 'p1' }), portalsById, commercesById);
    expect(row.scopeLabel).toBe('Portal: Otrahuilca');
  });

  it('resolves a COMMERCE scope to the real commerce trade name', () => {
    const row = buildUserRow(user({ scopeType: 'COMMERCE', scopeCommerceId: 'c1' }), portalsById, commercesById);
    expect(row.scopeLabel).toBe('Comercio: Supermercado La 14');
  });

  it('maps role to its label and tone', () => {
    const row = buildUserRow(user({ role: 'SUPERADMIN' }), portalsById, commercesById);
    expect(row.roleLabel).toBe('Superadministrador');
    expect(row.roleTone).toBe('accent');
  });
});

describe('buildRoleCounts', () => {
  it('counts users per real role (not the mock’s 5-role catalog)', () => {
    const counts = buildRoleCounts([
      user({ role: 'SUPERADMIN' }),
      user({ role: 'VIEWER' }),
      user({ role: 'VIEWER' }),
    ]);

    expect(counts).toHaveLength(4);
    expect(counts.find((c) => c.role === 'VIEWER')?.count).toBe(2);
    expect(counts.find((c) => c.role === 'ADMIN_PORTAL')?.count).toBe(0);
  });
});
