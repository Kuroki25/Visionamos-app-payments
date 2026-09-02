/**
 * Shared status-color vocabulary — matches Claude Design's theme tokens
 * (`successBg`/`success`, `dangerBg`/`danger`, `accentSoftBg`/`accent`, a
 * neutral/subtle pairing, and `orange`/`orangeSoftBg` for the one other
 * tint the mock actually reuses across ≥2 screens — the role chip color
 * for "Comercio" in Usuarios, see `app/globals.css`'s `--color-orange-soft`).
 * The mock's one-off purple for "Superadministrador" is NOT promoted to a
 * token — it's used exactly once, inline, never reused — see
 * `features/usuarios`'s role-tone mapping for how that role is colored
 * instead.
 */
export type Tone = 'success' | 'danger' | 'accent' | 'neutral' | 'orange';

export const toneBadgeClasses: Record<Tone, string> = {
  success: 'bg-(--color-success-soft) text-(--color-success)',
  danger: 'bg-(--color-danger-soft) text-(--color-danger)',
  accent: 'bg-(--color-accent-soft) text-(--color-accent)',
  neutral: 'bg-(--color-surface-subtle) text-(--color-fg-soft)',
  orange: 'bg-(--color-orange-soft) text-(--color-orange)',
};

/** Soft/tint background only — for icon chips whose glyph sets its own color via `currentColor` (`toneTextClasses`). */
export const toneSoftBgClasses: Record<Tone, string> = {
  success: 'bg-(--color-success-soft)',
  danger: 'bg-(--color-danger-soft)',
  accent: 'bg-(--color-accent-soft)',
  neutral: 'bg-(--color-surface-subtle)',
  orange: 'bg-(--color-orange-soft)',
};

export const toneTextClasses: Record<Tone, string> = {
  success: 'text-(--color-success)',
  danger: 'text-(--color-danger)',
  accent: 'text-(--color-accent)',
  neutral: 'text-(--color-fg-soft)',
  orange: 'text-(--color-orange)',
};

/** Solid border color — for left-accent-border cards (alerts). */
export const toneBorderClasses: Record<Tone, string> = {
  success: 'border-(--color-success)',
  danger: 'border-(--color-danger)',
  accent: 'border-(--color-accent)',
  neutral: 'border-(--color-fg-faint)',
  orange: 'border-(--color-orange)',
};

/** Solid (not soft/tint) background — for small indicator dots (toasts, list bullets). */
export const toneSolidBgClasses: Record<Tone, string> = {
  success: 'bg-(--color-success)',
  danger: 'bg-(--color-danger)',
  accent: 'bg-(--color-accent)',
  neutral: 'bg-(--color-fg-faint)',
  orange: 'bg-(--color-orange)',
};
