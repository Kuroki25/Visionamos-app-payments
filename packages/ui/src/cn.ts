/**
 * Tiny className joiner. A dedicated dependency (clsx/cva) buys nothing over
 * this for the handful of conditional classes our primitives use — see
 * docs/DEPENDENCY_POLICY.md "¿Necesitamos realmente esta dependencia?".
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
