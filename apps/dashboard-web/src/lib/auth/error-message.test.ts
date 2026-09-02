import { describe, expect, it } from 'vitest';

import { translateAuthErrorMessage } from './error-message';

// Regression: found via real E2E against the live Better Auth server —
// `signIn.email` with a wrong password returned the real, unlocalized
// "Invalid email or password" (English) instead of the app's Spanish
// copy, breaking the "Spanish-only UI" rule.
describe('translateAuthErrorMessage', () => {
  it('translates known Better Auth messages to Spanish, case-insensitively', () => {
    expect(translateAuthErrorMessage('Invalid email or password')).toBe('Correo o contraseña incorrectos.');
    expect(translateAuthErrorMessage('INVALID EMAIL OR PASSWORD')).toBe('Correo o contraseña incorrectos.');
    expect(translateAuthErrorMessage('Invalid password')).toBe('La contraseña actual es incorrecta.');
  });

  it('passes through an unrecognized message untouched rather than hiding it', () => {
    expect(translateAuthErrorMessage('Some new Better Auth error we have not seen yet')).toBe(
      'Some new Better Auth error we have not seen yet',
    );
  });

  it('handles missing messages without throwing', () => {
    expect(translateAuthErrorMessage(undefined)).toBeUndefined();
    expect(translateAuthErrorMessage(null)).toBeUndefined();
  });
});
