import { describe, expect, it } from 'vitest';

import { CreatePortalSchema, PortalSchema } from './portals';

describe('CreatePortalSchema', () => {
  it('accepts a valid name', () => {
    expect(CreatePortalSchema.safeParse({ name: 'Avanza' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreatePortalSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('PortalSchema', () => {
  it('accepts a fully-formed portal record', () => {
    const result = PortalSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Avanza',
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
