'use client';

import { useId, useState } from 'react';

import { ChevronDownIcon } from '../../../components/ui/icons';
import { faq } from '../../../content/es/faq';

/**
 * `03-public-home-faq.png`. A native `<button aria-expanded>` per item
 * (master prompt §20/§34) — Enter/Space work for free, no keyboard handler
 * needs reimplementing. Client Component: the only real interaction on the
 * whole page below the two search boxes.
 */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-(--color-ink) px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-heading" className="mb-8 text-center text-3xl font-bold">
          <span className="text-white">{faq.title}</span> <span className="text-(--color-fg-faint)">{faq.titleAccent}</span>
        </h2>

        <ul className="flex flex-col gap-3">
          {faq.items.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `${baseId}-button-${index}`;
            const panelId = `${baseId}-panel-${index}`;
            return (
              <li key={item.question} className="rounded-card border border-(--color-ink-border) bg-(--color-ink-soft)">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white"
                  >
                    {item.question}
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-(--color-fg-faint) transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                {isOpen ? (
                  <p id={panelId} role="region" aria-labelledby={buttonId} className="px-5 pb-4 text-sm text-(--color-fg-faint)">
                    {item.answer}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
