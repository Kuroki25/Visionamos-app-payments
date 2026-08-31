import { describe, expect, it } from 'vitest';

import { EntityStatusSchema, RoleSchema, ScopeTypeSchema } from './roles';

describe('RoleSchema', () => {
  it('accepts the four confirmed roles', () => {
    for (const role of ['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER']) {
      expect(RoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it('rejects a role outside the fixed set', () => {
    expect(RoleSchema.safeParse('ADMIN').success).toBe(false);
  });
});

describe('ScopeTypeSchema', () => {
  it('accepts GLOBAL, PORTAL, COMMERCE', () => {
    for (const scope of ['GLOBAL', 'PORTAL', 'COMMERCE']) {
      expect(ScopeTypeSchema.safeParse(scope).success).toBe(true);
    }
  });
});

describe('EntityStatusSchema', () => {
  it('accepts ACTIVE and INACTIVE', () => {
    expect(EntityStatusSchema.safeParse('ACTIVE').success).toBe(true);
    expect(EntityStatusSchema.safeParse('INACTIVE').success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(EntityStatusSchema.safeParse('PENDING').success).toBe(false);
  });
});
