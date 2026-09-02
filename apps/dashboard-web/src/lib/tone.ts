/**
 * Shared status-color vocabulary — matches the 4 status-color pairs Claude
 * Design's theme actually defines (`successBg`/`success`, `dangerBg`/
 * `danger`, `accentSoftBg`/`accent`, plus a neutral/subtle pairing). The
 * design also uses a couple of one-off inline colors (e.g. an orange role
 * chip) that aren't part of its shared theme tokens — those are deferred
 * to whichever later page actually needs them, not added speculatively
 * here.
 */
export type Tone = 'success' | 'danger' | 'accent' | 'neutral';

export const toneBadgeClasses: Record<Tone, string> = {
  success: 'bg-(--color-success-soft) text-(--color-success)',
  danger: 'bg-(--color-danger-soft) text-(--color-danger)',
  accent: 'bg-(--color-accent-soft) text-(--color-accent)',
  neutral: 'bg-(--color-surface-subtle) text-(--color-fg-soft)',
};

/** Soft/tint background only — for icon chips whose glyph sets its own color via `currentColor` (`toneTextClasses`). */
export const toneSoftBgClasses: Record<Tone, string> = {
  success: 'bg-(--color-success-soft)',
  danger: 'bg-(--color-danger-soft)',
  accent: 'bg-(--color-accent-soft)',
  neutral: 'bg-(--color-surface-subtle)',
};

export const toneTextClasses: Record<Tone, string> = {
  success: 'text-(--color-success)',
  danger: 'text-(--color-danger)',
  accent: 'text-(--color-accent)',
  neutral: 'text-(--color-fg-soft)',
};

/** Solid (not soft/tint) background — for small indicator dots (toasts, list bullets). */
export const toneSolidBgClasses: Record<Tone, string> = {
  success: 'bg-(--color-success)',
  danger: 'bg-(--color-danger)',
  accent: 'bg-(--color-accent)',
  neutral: 'bg-(--color-fg-faint)',
};
