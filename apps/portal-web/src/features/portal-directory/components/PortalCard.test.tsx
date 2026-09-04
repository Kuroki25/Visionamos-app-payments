import type { PublicPortal } from '@repo/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PortalCard } from './PortalCard';

const BASE_PORTAL: PublicPortal = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Avanza',
  displayName: 'Plataforma Avanza',
  serviceType: 'Educación',
  description: 'Portal educativo.',
  logoUrl: null,
};

describe('PortalCard', () => {
  it('links to the portal detail route by id', () => {
    render(<PortalCard portal={BASE_PORTAL} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/portales/${BASE_PORTAL.id}`);
  });

  it('prefers displayName over name when both exist', () => {
    render(<PortalCard portal={BASE_PORTAL} />);
    expect(screen.getByText('Plataforma Avanza')).toBeInTheDocument();
  });

  it('falls back to name when displayName is null (portals seeded before that field existed)', () => {
    render(<PortalCard portal={{ ...BASE_PORTAL, displayName: null }} />);
    expect(screen.getByText('Avanza')).toBeInTheDocument();
  });

  it('renders the real logo when logoUrl is present, not a fallback icon', () => {
    render(<PortalCard portal={{ ...BASE_PORTAL, logoUrl: `/portals/${BASE_PORTAL.id}/logo` }} />);
    const img = screen.getByRole('img', { name: 'Logo de Plataforma Avanza' });
    expect(img).toHaveAttribute('src', expect.stringContaining(`/portals/${BASE_PORTAL.id}/logo`));
  });

  it('renders a neutral fallback (no broken image, no "undefined") when logoUrl is null', () => {
    render(<PortalCard portal={BASE_PORTAL} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });
});
