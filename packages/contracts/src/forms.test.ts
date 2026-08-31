import { describe, expect, it } from 'vitest';

import { CreateFormFieldSchema, CreateFormSubmissionSchema, FormVersionSchema } from './forms';

describe('CreateFormFieldSchema', () => {
  it('accepts a TEXT field with no options', () => {
    const result = CreateFormFieldSchema.safeParse({ key: 'studentCode', label: 'Código de estudiante', type: 'TEXT' });
    expect(result.success).toBe(true);
  });

  it('rejects a SELECT field with no options', () => {
    const result = CreateFormFieldSchema.safeParse({ key: 'program', label: 'Programa', type: 'SELECT' });
    expect(result.success).toBe(false);
  });

  it('accepts a SELECT field with at least one option', () => {
    const result = CreateFormFieldSchema.safeParse({
      key: 'program',
      label: 'Programa',
      type: 'SELECT',
      options: [{ value: 'sistemas', label: 'Ingeniería de Sistemas' }],
    });
    expect(result.success).toBe(true);
  });

  it('defaults isRequired to false and sortOrder to 0', () => {
    const result = CreateFormFieldSchema.parse({ key: 'notes', label: 'Notas', type: 'TEXT' });
    expect(result.isRequired).toBe(false);
    expect(result.sortOrder).toBe(0);
  });
});

describe('CreateFormSubmissionSchema', () => {
  it('accepts an arbitrary key-value map', () => {
    const result = CreateFormSubmissionSchema.safeParse({ answers: { studentCode: 'A123', period: '2026-1' } });
    expect(result.success).toBe(true);
  });
});

describe('FormVersionSchema', () => {
  it('accepts a fully-formed form version record', () => {
    const result = FormVersionSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      formDefinitionId: '123e4567-e89b-12d3-a456-426614174001',
      versionNumber: 1,
      status: 'ACTIVE',
      isPublished: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
