import { describe, expect, it } from 'vitest';

import { AuditEventSchema } from './audit';

describe('AuditEventSchema', () => {
  it('accepts a fully-formed audit event with no target snapshot', () => {
    const result = AuditEventSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      actorUserId: '123e4567-e89b-12d3-a456-426614174001',
      action: 'USER_CREATED',
      targetType: 'USER',
      targetId: '123e4567-e89b-12d3-a456-426614174002',
      scopeType: 'GLOBAL',
      scopePortalId: null,
      scopeCommerceId: null,
      previousValue: null,
      newValue: null,
      metadata: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a ROLE_REASSIGNED event with previous/new snapshots', () => {
    const result = AuditEventSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      actorUserId: '123e4567-e89b-12d3-a456-426614174001',
      action: 'ROLE_REASSIGNED',
      targetType: 'ROLE_ASSIGNMENT',
      targetId: '123e4567-e89b-12d3-a456-426614174002',
      scopeType: 'PORTAL',
      scopePortalId: '123e4567-e89b-12d3-a456-426614174003',
      scopeCommerceId: null,
      previousValue: { role: 'ADMIN_PORTAL', scopeType: 'PORTAL', scopePortalId: 'old-portal' },
      newValue: { role: 'ADMIN_PORTAL', scopeType: 'PORTAL', scopePortalId: 'new-portal' },
      metadata: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an action outside the fixed catalog', () => {
    const result = AuditEventSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      actorUserId: '123e4567-e89b-12d3-a456-426614174001',
      action: 'SOMETHING_ELSE',
      targetType: 'USER',
      targetId: '123e4567-e89b-12d3-a456-426614174002',
      scopeType: 'GLOBAL',
      scopePortalId: null,
      scopeCommerceId: null,
      previousValue: null,
      newValue: null,
      metadata: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
