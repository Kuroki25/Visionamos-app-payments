import { describe, expect, it } from 'vitest';

import { CreateUserSchema, UserSchema } from './users';

const PORTAL_ID = '123e4567-e89b-12d3-a456-426614174001';
const COMMERCE_ID = '123e4567-e89b-12d3-a456-426614174002';

describe('CreateUserSchema', () => {
  it('accepts a SUPERADMIN with no scope', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an ADMIN_PORTAL with scopePortalId', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'ADMIN_PORTAL',
      scopePortalId: PORTAL_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an ADMIN_PORTAL without scopePortalId', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'ADMIN_PORTAL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an ADMIN_COMMERCE without scopeCommerceId', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'ADMIN_COMMERCE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a SUPERADMIN with a portal scope', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
      scopePortalId: PORTAL_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects both scopePortalId and scopeCommerceId set at once', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'VIEWER',
      scopePortalId: PORTAL_ID,
      scopeCommerceId: COMMERCE_ID,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a VIEWER with no scope (defaults to GLOBAL)', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'VIEWER',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = CreateUserSchema.safeParse({
      email: 'not-an-email',
      password: 'a-strong-password-123',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 12 characters', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      password: 'short1',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
    });
    expect(result.success).toBe(false);
  });
});

describe('UserSchema', () => {
  it('accepts a fully-formed user record', () => {
    const result = UserSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
      scopeType: 'GLOBAL',
      scopePortalId: null,
      scopeCommerceId: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    const result = UserSchema.safeParse({
      id: 'not-a-uuid',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'SUPERADMIN',
      scopeType: 'GLOBAL',
      scopePortalId: null,
      scopeCommerceId: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
