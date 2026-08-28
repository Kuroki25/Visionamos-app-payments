import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Enviar
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the danger variant classes', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('bg-red-600');
  });
});
