import { describe, expect, it } from 'vitest';

import { CreateServiceSchema, ServiceSchema } from './services';

describe('CreateServiceSchema', () => {
  it('accepts a valid name', () => {
    expect(CreateServiceSchema.safeParse({ name: 'Matrícula' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreateServiceSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('ServiceSchema', () => {
  it('accepts a fully-formed service record and has no status field', () => {
    const result = ServiceSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      commerceId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Matrícula',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(ServiceSchema.shape).not.toHaveProperty('status');
  });
});
