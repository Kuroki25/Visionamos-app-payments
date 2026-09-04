'use client';

import type { PublicCommerce } from '@repo/contracts';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import { apiClient } from '../../../lib/api/client';
import { home } from '../../../content/es/home';
import { SearchInput } from './SearchInput';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Global commerce search (`01-public-home-directory.png`, "Buscar comercios
 * aliados") — searches every published+active Commerce of every
 * published+active Portal (`GET /public/commerces`, master prompt §15).
 * Submit-driven (a real `<form>`, matching the reference's explicit
 * "Buscar" button — not a live-as-you-type dropdown), client-fetched
 * because this is genuinely interactive (master prompt §43).
 *
 * A result links to its Portal (`/portales/[portalId]`) rather than a
 * dedicated Commerce page — Commerce detail/Service selection is a later
 * slice (PORTAL_WEB_SOURCE_OF_TRUTH.md, "Deferred Features"); this stays
 * honest about that instead of linking somewhere that doesn't exist.
 */
export function GlobalCommerceSearch() {
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<PublicCommerce[]>([]);

  // `setStatus('loading')` happens in `handleSubmit` (a real event handler),
  // not synchronously in this effect body — react-hooks/set-state-in-effect
  // flags the latter as a cascading-render risk. The effect itself only
  // starts the fetch and settles the result from the async callback.
  useEffect(() => {
    if (submittedQuery === null) {
      return;
    }
    const controller = new AbortController();
    apiClient
      .get<{ items: PublicCommerce[] }>(`/public/commerces?q=${encodeURIComponent(submittedQuery)}&pageSize=8`, controller.signal)
      .then((response) => {
        setResults(response.items);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }
        setStatus('error');
      });
    return () => controller.abort();
  }, [submittedQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSubmittedQuery(null);
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setSubmittedQuery(trimmed);
  }

  return (
    <div>
      <SearchInput
        id="commerce-search"
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder={home.hero.searchPlaceholder}
        ariaLabel={home.hero.searchLabel}
        submitLabel="Buscar"
      />

      <div aria-live="polite" className="mt-4">
        {status === 'loading' ? <p className="text-sm text-(--color-fg-faint)">Buscando...</p> : null}
        {status === 'error' ? <p className="text-sm text-red-600">{home.commerceSearch.error}</p> : null}
        {status === 'success' && results.length === 0 ? (
          <p className="text-sm text-(--color-fg-faint)">{home.commerceSearch.noResults}</p>
        ) : null}
        {status === 'success' && results.length > 0 ? (
          <ul className="flex flex-col gap-1">
            <p className="mb-1 text-xs font-medium text-(--color-fg-faint)">{home.commerceSearch.resultsHeading(results.length)}</p>
            {results.map((commerce) => (
              <li key={commerce.id}>
                <Link
                  href={`/portales/${commerce.portalId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-(--color-surface-muted)"
                >
                  <span className="font-medium text-(--color-fg)">{commerce.tradeName}</span>
                  <span className="text-(--color-fg-faint)">{home.commerceSearch.resultSubtitle(commerce.portalName)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
