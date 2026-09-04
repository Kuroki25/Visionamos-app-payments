import type { PageMeta } from '@repo/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page — real data, not a hardcoded "Página 1 de 2"', () => {
    const meta: PageMeta = { page: 1, pageSize: 12, total: 3, totalPages: 1 };
    const { container } = render(<Pagination meta={meta} buildHref={(p) => `/?page=${p}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link per page and marks the current one with aria-current', () => {
    const meta: PageMeta = { page: 1, pageSize: 1, total: 2, totalPages: 2 };
    render(<Pagination meta={meta} buildHref={(p) => `/?page=${p}`} />);
    expect(screen.getByRole('link', { name: 'Ir a la página 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Ir a la página 2' })).toHaveAttribute('href', '/?page=2');
  });

  it('reports "Página X de Y" from real meta', () => {
    const meta: PageMeta = { page: 1, pageSize: 1, total: 2, totalPages: 2 };
    render(<Pagination meta={meta} buildHref={(p) => `/?page=${p}`} />);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('disables the "previous" arrow on the first page (no link, not a dead link)', () => {
    const meta: PageMeta = { page: 1, pageSize: 1, total: 2, totalPages: 2 };
    render(<Pagination meta={meta} buildHref={(p) => `/?page=${p}`} />);
    expect(screen.queryByRole('link', { name: 'Página anterior' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Página siguiente' })).toHaveAttribute('href', '/?page=2');
  });
});
