import { describe, expect, it } from 'vitest';

import { formatCOP, formatDateEs, getInitials } from './format';

describe('getInitials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(getInitials('Admin Usuario')).toBe('AU');
    expect(getInitials('valentina castro')).toBe('VC');
  });

  it('handles a single-word name', () => {
    expect(getInitials('Cher')).toBe('C');
  });

  it('ignores repeated spaces', () => {
    expect(getInitials('Ana   Martínez')).toBe('AM');
  });
});

describe('formatCOP', () => {
  it('formats an integer amount with the es-CO thousands separator', () => {
    expect(formatCOP(2000000)).toBe('$2.000.000');
  });

  it('rounds non-integer amounts', () => {
    expect(formatCOP(20000.6)).toBe('$20.001');
  });
});

describe('formatDateEs', () => {
  it('formats an ISO datetime as DD/MM/YYYY', () => {
    expect(formatDateEs('2026-01-20T16:22:33.000Z')).toBe('20/01/2026');
  });
});
