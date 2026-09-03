import { describe, expect, it } from 'vitest';

import { CreatePortalSchema, PortalSchema, UpdatePortalSchema } from './portals';

describe('CreatePortalSchema', () => {
  it('accepts a valid name', () => {
    expect(CreatePortalSchema.safeParse({ name: 'Avanza' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreatePortalSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts an optional status (defaults to ACTIVE server-side when absent)', () => {
    expect(CreatePortalSchema.safeParse({ name: 'Avanza', status: 'INACTIVE' }).success).toBe(true);
    expect(CreatePortalSchema.safeParse({ name: 'Avanza' }).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(CreatePortalSchema.safeParse({ name: 'Avanza', status: 'DELETED' }).success).toBe(false);
  });
});

describe('UpdatePortalSchema', () => {
  it('has no status field, even though CreatePortalSchema does — PATCH /portals/:id/status is the only audited path', () => {
    const result = UpdatePortalSchema.safeParse({ name: 'Avanza', status: 'INACTIVE' });
    // Zod strips unknown keys by default — `status` is silently dropped,
    // not rejected, and never reaches PortalsService.update().
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('status');
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
