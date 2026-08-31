import { describe, expect, it } from 'vitest';

import { ReassignScopeSchema } from './role-assignments';

const PORTAL_ID = '123e4567-e89b-12d3-a456-426614174001';
const COMMERCE_ID = '123e4567-e89b-12d3-a456-426614174002';

describe('ReassignScopeSchema', () => {
  it('accepts SUPERADMIN + GLOBAL with no ids', () => {
    const result = ReassignScopeSchema.safeParse({ role: 'SUPERADMIN', scopeType: 'GLOBAL' });
    expect(result.success).toBe(true);
  });

  it('accepts ADMIN_PORTAL + PORTAL with scopePortalId', () => {
    const result = ReassignScopeSchema.safeParse({
      role: 'ADMIN_PORTAL',
      scopeType: 'PORTAL',
      scopePortalId: PORTAL_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects ADMIN_PORTAL + PORTAL without scopePortalId', () => {
    const result = ReassignScopeSchema.safeParse({ role: 'ADMIN_PORTAL', scopeType: 'PORTAL' });
    expect(result.success).toBe(false);
  });

  it('rejects a role/scopeType mismatch (SUPERADMIN + PORTAL)', () => {
    const result = ReassignScopeSchema.safeParse({
      role: 'SUPERADMIN',
      scopeType: 'PORTAL',
      scopePortalId: PORTAL_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects PORTAL scope carrying a scopeCommerceId too', () => {
    const result = ReassignScopeSchema.safeParse({
      role: 'ADMIN_PORTAL',
      scopeType: 'PORTAL',
      scopePortalId: PORTAL_ID,
      scopeCommerceId: COMMERCE_ID,
    });
    expect(result.success).toBe(false);
  });

  it('accepts VIEWER + COMMERCE', () => {
    const result = ReassignScopeSchema.safeParse({
      role: 'VIEWER',
      scopeType: 'COMMERCE',
      scopeCommerceId: COMMERCE_ID,
    });
    expect(result.success).toBe(true);
  });
});
