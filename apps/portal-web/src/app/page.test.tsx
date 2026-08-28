import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('Home (portal-web)', () => {
  it('renders the portal heading and the shared Button/Badge from @repo/ui', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Portal Visionamos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeInTheDocument();
    expect(screen.getByText('@repo/ui conectado')).toBeInTheDocument();
  });
});
