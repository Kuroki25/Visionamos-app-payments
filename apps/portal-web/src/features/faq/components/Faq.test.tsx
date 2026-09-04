import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { faq } from '../../../content/es/faq';
import { Faq } from './Faq';

describe('Faq', () => {
  it('renders every question collapsed by default', () => {
    render(<Faq />);
    for (const item of faq.items) {
      expect(screen.getByRole('button', { name: new RegExp(item.question) })).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('expands a question on click (real button, real aria-expanded) and shows its answer', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const firstQuestion = faq.items[0];
    const button = screen.getByRole('button', { name: new RegExp(firstQuestion.question) });

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(firstQuestion.answer)).toBeInTheDocument();
  });

  it('works with the keyboard alone (Enter activates a focused button)', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const firstQuestion = faq.items[0];
    const button = screen.getByRole('button', { name: new RegExp(firstQuestion.question) });

    button.focus();
    await user.keyboard('{Enter}');

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const firstQuestion = faq.items[0];
    const button = screen.getByRole('button', { name: new RegExp(firstQuestion.question) });

    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(firstQuestion.answer)).not.toBeInTheDocument();
  });
});
