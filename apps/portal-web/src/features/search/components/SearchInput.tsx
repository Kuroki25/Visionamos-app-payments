import type { FormEvent } from 'react';

import { SearchIcon } from '../../../components/ui/icons';

interface SearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  ariaLabel: string;
  submitLabel: string;
}

/**
 * Shared search primitive (master prompt §13: "Podemos tener variantes
 * PortalSearch/CommerceSearch pero deben reutilizar una primitiva/patrón
 * común") — a real `<form onSubmit>` (§34: never a `div`+`onClick`), so
 * Enter submits it natively and no keyboard handler needs reimplementing.
 * Presentational only — no hooks of its own, so it needs no `"use client"`;
 * every current caller happens to be a Client Component, but that's their
 * concern, not this one's.
 */
export function SearchInput({ id, value, onChange, onSubmit, placeholder, ariaLabel, submitLabel }: SearchInputProps) {
  return (
    <form role="search" onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>
      <div className="flex flex-1 items-center gap-2 rounded-pill bg-(--color-surface-muted) px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-(--color-fg-faint)" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-(--color-fg) placeholder:text-(--color-fg-faint) focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-pill bg-(--color-brand-blue) px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-blue)"
      >
        {submitLabel}
      </button>
    </form>
  );
}
