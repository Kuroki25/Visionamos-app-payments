import { describe, expect, it } from 'vitest';

import { CommerceSchema, CreateCommerceSchema } from './commerces';

const validCreatePayload = {
  categoryId: '123e4567-e89b-12d3-a456-426614174001',
  tradeName: 'Universidad X',
  legalName: 'Universidad X S.A.S.',
  taxId: '900123456-7',
  contactName: 'Carlos Pérez',
  contactEmail: 'carlos@universidadx.edu.co',
  contactPhone: '3001234567',
  address: 'Calle 1 # 2-3',
  city: 'Bogotá',
};

describe('CreateCommerceSchema', () => {
  it('accepts a fully-formed payload', () => {
    expect(CreateCommerceSchema.safeParse(validCreatePayload).success).toBe(true);
  });

  it('rejects an invalid contactEmail', () => {
    const result = CreateCommerceSchema.safeParse({ ...validCreatePayload, contactEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing taxId', () => {
    const { taxId: _taxId, ...withoutTaxId } = validCreatePayload;
    expect(CreateCommerceSchema.safeParse(withoutTaxId).success).toBe(false);
  });
});

describe('CommerceSchema', () => {
  it('accepts a fully-formed commerce record and never carries banking fields', () => {
    const result = CommerceSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      portalId: '123e4567-e89b-12d3-a456-426614174002',
      ...validCreatePayload,
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(CommerceSchema.shape).not.toHaveProperty('bankAccount');
  });
});
