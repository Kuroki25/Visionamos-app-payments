import { describe, expect, it } from 'vitest';

import { CreateUserSchema, UserSchema } from './users';

describe('CreateUserSchema', () => {
  it('accepts a valid payload and defaults role to member', () => {
    const result = CreateUserSchema.parse({
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
    });

    expect(result).toEqual({
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
    });
  });

  it('rejects an invalid email', () => {
    const result = CreateUserSchema.safeParse({
      email: 'not-an-email',
      fullName: 'Ana Pérez',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty fullName', () => {
    const result = CreateUserSchema.safeParse({
      email: 'ana@example.com',
      fullName: '',
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
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    const result = UserSchema.safeParse({
      id: 'not-a-uuid',
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});
