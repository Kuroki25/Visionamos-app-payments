'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { common } from '../../../content/es/common';
import { home } from '../../../content/es/home';
import { SearchInput } from './SearchInput';

/**
 * Portal directory search (`01-public-home-directory.png`, "Escribe el
 * nombre del portal"). URL-search-params-driven (master prompt §14:
 * shareable/refresh-safe/deep-linkable) — submitting updates `?q=` (and
 * resets `?page=`), which the Server Component `PortalDirectory` re-fetches
 * against on the resulting navigation. The only client-side state is the
 * uncommitted input value between keystrokes and submit.
 */
export function PortalSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    params.delete('page'); // a new search always starts back at page 1
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <SearchInput
      id="portal-search"
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      placeholder={home.portalDirectory.searchPlaceholder}
      ariaLabel={home.portalDirectory.searchLabel}
      submitLabel={common.search}
    />
  );
}
