/**
 * Small cross-cutting display-formatting helpers — shared by `components/
 * layout` and `features/*`, so this lives in `lib/`, not inside a feature
 * (`docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Reglas de
 * dependencias": features may import `lib/*`, nothing feature-specific
 * belongs here).
 */

/** Same algorithm Claude Design's mock uses for avatar initials. */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Matches the mock's `fmt()` helper: `'$' + Math.round(n).toLocaleString('es-CO')`. */
export function formatCOP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CO');
}

/** `count === 1 ? singular : plural` — Spanish has no automatic pluralization rule simple enough to derive from one form, so callers pass both. */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** `DD/MM/YYYY` in `es-CO`, matching the mock's transaction row date format. */
export function formatDateEs(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  );
}
