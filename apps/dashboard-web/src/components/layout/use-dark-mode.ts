'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Manual light/dark toggle backing the sidebar's "Modo oscuro" switch
 * (Claude Design: `state.dark` + `toggleDark`). Persisted per-browser via
 * `localStorage` — this is a UI preference, not session data, so it's not
 * subject to the "session never in localStorage" rule
 * (`docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Seguridad") —
 * that rule is about the Better Auth session cookie, not display settings.
 *
 * Applies/removes a `dark` class on `<html>`, which `globals.css`'s
 * `@custom-variant dark` and CSS-variable overrides key off. Runs entirely
 * in an effect (not a blocking inline script) because
 * `dangerouslySetInnerHTML` is off-limits in this app — the tradeoff is a
 * brief flash of the light theme on first paint for a returning dark-mode
 * user, accepted for this pass and worth revisiting only if it proves to
 * bother real users (this is an authenticated admin panel, not a public
 * marketing page).
 */
const STORAGE_KEY = 'dashboard-web:theme';

export function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can throw (private browsing, disabled site data) — default
      // to light, same as a first-time visitor.
    }
    const initial = stored === 'dark';
    // Syncing from an external system (localStorage/DOM) read after mount —
    // exactly what this effect exists for. Rendering `false` first (matching
    // SSR) and correcting after mount, instead of reading storage in a lazy
    // `useState` initializer, is deliberate: that initializer would run
    // during hydration too and could disagree with the server-rendered
    // markup (e.g. the switch thumb position), which is a real hydration
    // mismatch — a one-frame flash on a returning dark-mode user is the
    // smaller cost.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // Non-fatal — theme just won't persist across reloads.
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
