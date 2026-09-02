export interface GoalMetric {
  pct: number;
  dashArray: string;
  todayAmountLabel: string;
}

/**
 * "Meta mensual" — Inicio-only (unlike the 3 stat cards, the design does
 * not reuse this gauge on any other screen — see `lib/metrics.ts` for
 * those). There is no "meta"/goal concept anywhere in `@repo/contracts`
 * yet, so this is a static illustrative value; see the handoff analysis,
 * "Datos estáticos → datos reales".
 */
export function getStaticGoal(): GoalMetric {
  const pct = 75.55;
  const circumference = Math.PI * 80;
  return {
    pct,
    dashArray: `${((circumference * pct) / 100).toFixed(1)} ${circumference.toFixed(1)}`,
    todayAmountLabel: '$3.287.000',
  };
}
