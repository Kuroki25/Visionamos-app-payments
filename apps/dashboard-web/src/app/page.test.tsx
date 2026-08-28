import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('Home (dashboard-web)', () => {
  it('renders the dashboard heading and the shared Button/Badge from @repo/ui', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Dashboard Visionamos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver reportes' })).toBeInTheDocument();
    expect(screen.getByText('@repo/ui conectado')).toBeInTheDocument();
  });
});
