import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnauthenticatedNotice } from './UnauthenticatedNotice';

describe('UnauthenticatedNotice', () => {
  it('renders the app name and the shared unauthenticated message', () => {
    render(<UnauthenticatedNotice />);

    expect(screen.getByRole('heading', { name: 'Dashboard Visionamos' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu sesión expiró o no has iniciado sesión. Inicia sesión de nuevo.',
    );
  });
});
