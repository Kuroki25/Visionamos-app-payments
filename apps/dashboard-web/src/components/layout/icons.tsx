import type { SVGProps } from 'react';

/**
 * Inline line icons ported 1:1 (same paths/viewBoxes) from Claude Design's
 * "RedCoop Dashboard.dc.html" — the design has no icon library, every icon
 * is a hand-authored inline SVG, so matching it exactly means keeping that
 * approach rather than swapping in a new icon-library dependency (see
 * "no agregues dependencias sin necesidad demostrada").
 *
 * All icons default to `currentColor` and take normal SVG props so callers
 * size/color them with Tailwind classes (`className="h-[18px] w-[18px]"` etc).
 */
type IconProps = SVGProps<SVGSVGElement>;

export function MenuIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <polygon points="12,3 21,10 21,21 3,21 3,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="9" y="14" width="6" height="7" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

export function TransactionsIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <line x1="6" y1="16" x2="6" y2="6" stroke="currentColor" strokeWidth="2" />
      <polygon points="6,3 9,8 3,8" fill="currentColor" />
      <line x1="18" y1="8" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
      <polygon points="18,21 21,16 15,16" fill="currentColor" />
    </svg>
  );
}

export function PortalsIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="4" width="18" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="14" width="12" height="7" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="1.5" x2="12" y2="4" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="20" x2="12" y2="22.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 10a6 6 0 1 1 12 0v4l1.5 3h-15L6 14z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="21" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
