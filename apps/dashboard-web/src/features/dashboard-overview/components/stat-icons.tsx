/**
 * Trend arrows for `StatCard` — exact line/polygon coordinates from Claude
 * Design's `statCards[].arrow`. Colored via `currentColor`: the caller sets
 * color by wrapping these in an element carrying a `text-*` class
 * (`lib/tone.ts`'s `toneTextClasses`), not via a color prop.
 */
export function TrendUpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="15" x2="15" y2="6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <polygon points="15,10 15,3 8,3" fill="currentColor" />
    </svg>
  );
}

export function TrendDownIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="6" x2="15" y2="15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <polygon points="15,10 15,17 8,17" fill="currentColor" />
    </svg>
  );
}

export function TrendRightIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <line x1="5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <polygon points="15,4 19,8 15,12" fill="currentColor" />
    </svg>
  );
}
