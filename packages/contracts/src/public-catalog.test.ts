import { describe, expect, it } from 'vitest';

import { PublicCommerceSchema, PublicCommercesQuerySchema, PublicPortalSchema, PublicPortalsQuerySchema } from './public-catalog';

const PORTAL_ID = '123e4567-e89b-12d3-a456-426614174000';

const VALID_PORTAL = {
  id: PORTAL_ID,
  name: 'Avanza',
  displayName: 'Plataforma Avanza',
  serviceType: 'Educación',
  description: 'Portal de pagos para instituciones educativas.',
  logoUrl: `/portals/${PORTAL_ID}/logo`,
};

describe('PublicPortalSchema', () => {
  it('accepts a fully-formed public portal', () => {
    expect(PublicPortalSchema.safeParse(VALID_PORTAL).success).toBe(true);
  });

  it('accepts null branding fields — the 3 seeded portals predate displayName/serviceType/description/logo', () => {
    expect(
      PublicPortalSchema.safeParse({
        ...VALID_PORTAL,
        displayName: null,
        serviceType: null,
        description: null,
        logoUrl: null,
      }).success,
    ).toBe(true);
  });

  it('rejects admin-only fields being required — status/isPublished must not leak into the public shape', () => {
    // The schema simply has no such keys; parsing strips/ignores extras by
    // default, so this only proves the schema doesn't *require* them.
    const { success, data } = PublicPortalSchema.safeParse({ ...VALID_PORTAL, status: 'ACTIVE', isPublished: true });
    expect(success).toBe(true);
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('isPublished');
  });
});

describe('PublicPortalsQuerySchema', () => {
  it('accepts an optional, length-capped search term', () => {
    expect(PublicPortalsQuerySchema.safeParse({ q: 'avanza' }).success).toBe(true);
    expect(PublicPortalsQuerySchema.safeParse({}).success).toBe(true);
    expect(PublicPortalsQuerySchema.safeParse({ q: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('PublicCommerceSchema', () => {
  it('accepts a fully-formed public commerce with its portal/category denormalized', () => {
    expect(
      PublicCommerceSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174001',
        tradeName: 'Colegio San José',
        portalId: PORTAL_ID,
        portalName: 'Avanza',
        categoryId: '123e4567-e89b-12d3-a456-426614174002',
        categoryName: 'Educación',
      }).success,
    ).toBe(true);
  });
});

describe('PublicCommercesQuerySchema', () => {
  it('accepts optional q/portalId/categoryId filters', () => {
    expect(PublicCommercesQuerySchema.safeParse({}).success).toBe(true);
    expect(PublicCommercesQuerySchema.safeParse({ q: 'colegio', portalId: PORTAL_ID }).success).toBe(true);
  });

  it('rejects a non-UUID portalId', () => {
    expect(PublicCommercesQuerySchema.safeParse({ portalId: 'not-a-uuid' }).success).toBe(false);
  });
});
