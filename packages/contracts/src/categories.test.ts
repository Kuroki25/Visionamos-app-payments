import { describe, expect, it } from 'vitest';

import { CategorySchema, CreateCategorySchema } from './categories';

describe('CreateCategorySchema', () => {
  it('accepts a valid name', () => {
    expect(CreateCategorySchema.safeParse({ name: 'Instituciones educativas' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreateCategorySchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('CategorySchema', () => {
  it('accepts a fully-formed category record', () => {
    const result = CategorySchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      portalId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Instituciones educativas',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
