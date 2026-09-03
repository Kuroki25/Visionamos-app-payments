import { describe, expect, it } from 'vitest';

import { CreatePortalSchema, PortalSchema, UpdatePortalSchema } from './portals';

const VALID_CREATE = {
  name: 'Avanza',
  displayName: 'Plataforma Avanza',
  serviceType: 'Educación',
  description: 'Portal de pagos para instituciones educativas.',
};

describe('CreatePortalSchema', () => {
  it('accepts a valid, fully-formed portal', () => {
    expect(CreatePortalSchema.safeParse(VALID_CREATE).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreatePortalSchema.safeParse({ ...VALID_CREATE, name: '' }).success).toBe(false);
  });

  it('requires displayName, serviceType and description — the user confirmed these as real fields (§17.2)', () => {
    expect(CreatePortalSchema.safeParse({ name: 'Avanza', serviceType: 'Educación', description: 'x' }).success).toBe(
      false,
    ); // missing displayName
    expect(CreatePortalSchema.safeParse({ name: 'Avanza', displayName: 'x', description: 'x' }).success).toBe(false); // missing serviceType
    expect(CreatePortalSchema.safeParse({ name: 'Avanza', displayName: 'x', serviceType: 'x' }).success).toBe(false); // missing description
  });

  it('rejects a description longer than 500 characters (the reference image\'s own counter)', () => {
    expect(CreatePortalSchema.safeParse({ ...VALID_CREATE, description: 'a'.repeat(501) }).success).toBe(false);
    expect(CreatePortalSchema.safeParse({ ...VALID_CREATE, description: 'a'.repeat(500) }).success).toBe(true);
  });

  it('accepts an optional status (defaults to ACTIVE server-side when absent)', () => {
    expect(CreatePortalSchema.safeParse({ ...VALID_CREATE, status: 'INACTIVE' }).success).toBe(true);
    expect(CreatePortalSchema.safeParse(VALID_CREATE).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(CreatePortalSchema.safeParse({ ...VALID_CREATE, status: 'DELETED' }).success).toBe(false);
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

  it('allows editing displayName/serviceType/description independently (all optional here, unlike on create)', () => {
    expect(UpdatePortalSchema.safeParse({ displayName: 'Nueva plataforma' }).success).toBe(true);
    expect(UpdatePortalSchema.safeParse({}).success).toBe(true);
  });
});

describe('PortalSchema', () => {
  it('accepts a fully-formed portal record, including the new fields', () => {
    const result = PortalSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Avanza',
      displayName: 'Plataforma Avanza',
      serviceType: 'Educación',
      description: 'Portal de pagos para instituciones educativas.',
      logoUrl: '/portals/123e4567-e89b-12d3-a456-426614174000/logo',
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for displayName/serviceType/description/logoUrl — the 3 portals seeded before this pass have none of them', () => {
    const result = PortalSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Avanza',
      displayName: null,
      serviceType: null,
      description: null,
      logoUrl: null,
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
