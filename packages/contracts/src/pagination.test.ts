import { describe, expect, it } from 'vitest';

import { buildPageMeta, PaginationQuerySchema, paginatedSchema } from './pagination';
import { PublicPortalSchema } from './public-catalog';

describe('PaginationQuerySchema', () => {
  it('defaults page to 1 and pageSize to 12 when absent', () => {
    const result = PaginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 12 });
  });

  it('coerces string query params (HTTP query strings are always strings)', () => {
    const result = PaginationQuerySchema.parse({ page: '2', pageSize: '20' });
    expect(result).toEqual({ page: 2, pageSize: 20 });
  });

  it('rejects a pageSize above 50 — an unauthenticated endpoint must never allow an unbounded page', () => {
    expect(PaginationQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ pageSize: 50 }).success).toBe(true);
  });

  it('rejects page below 1', () => {
    expect(PaginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('buildPageMeta', () => {
  it('computes totalPages from total/pageSize', () => {
    expect(buildPageMeta(1, 8, 17)).toEqual({ page: 1, pageSize: 8, total: 17, totalPages: 3 });
  });

  it('reports "página 1 de 1" for an empty result set, never "de 0"', () => {
    expect(buildPageMeta(1, 12, 0)).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  });
});

describe('paginatedSchema', () => {
  it('validates { items, meta } against the wrapped item schema', () => {
    const schema = paginatedSchema(PublicPortalSchema);
    const valid = {
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Avanza',
          displayName: null,
          serviceType: null,
          description: null,
          logoUrl: null,
        },
      ],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    };
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ items: [{ id: 'not-a-uuid' }], meta: valid.meta }).success).toBe(false);
  });
});
