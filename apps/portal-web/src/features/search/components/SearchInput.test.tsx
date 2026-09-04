import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';

function renderControlled(value = '') {
  const onChange = vi.fn();
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
  render(
    <SearchInput
      id="test-search"
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder="Escribe el nombre del portal"
      ariaLabel="Buscar portales por nombre"
      submitLabel="Buscar"
    />,
  );
  return { onChange, onSubmit };
}

describe('SearchInput', () => {
  it('renders a real <form> with an accessible label, not a div+onClick', () => {
    renderControlled();
    expect(screen.getByRole('searchbox', { name: 'Buscar portales por nombre' })).toBeInTheDocument();
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControlled();
    await user.type(screen.getByRole('searchbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('submits on Enter (native form submission), not just on button click', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderControlled('avanza');
    await user.type(screen.getByRole('searchbox'), '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits when the button is clicked', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderControlled('avanza');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
