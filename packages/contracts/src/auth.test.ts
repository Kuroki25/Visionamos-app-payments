import { describe, expect, it } from 'vitest';

import { LoginSchema } from './auth';

describe('LoginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = LoginSchema.safeParse({ email: 'ana@example.com', password: 'whatever' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = LoginSchema.safeParse({ email: 'ana@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
