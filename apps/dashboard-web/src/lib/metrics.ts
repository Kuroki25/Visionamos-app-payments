import type { Tone } from './tone';

export interface StatCardDef {
  id: string;
  label: string;
  value: string;
  change: string;
  tone: Tone;
  /** SVG `<polyline points>` for the mini sparkline, viewBox `0 0 70 28`. */
  sparkline: string;
}

/**
 * "Ingresos/Egresos/Transacciones totales /mes" — Claude Design's mock
 * shows the exact same 3 cards on both Inicio and Transacciones
 * ("RedCoop Dashboard.dc.html", `statCards`, reused by both `isInicio` and
 * `isTx` blocks) — lives in `lib/` rather than a feature for the same
 * reason `lib/transactions.ts` does: shared across pages, and features may
 * not import each other.
 *
 * No `GET /transactions` aggregate/summary endpoint exists in the backend
 * yet (only a scope-filtered list — see `transactions.controller.ts`), so
 * these stay static placeholder values, isolated behind this one function
 * so a real aggregate endpoint can replace it later without touching any
 * component. See the handoff analysis, "Datos estáticos → datos reales".
 */
export function getStaticStatCards(): StatCardDef[] {
  return [
    {
      id: 'ingresos',
      label: 'Ingresos totales /mes',
      value: '$2.000.000',
      change: '↗ 11.01%',
      tone: 'success',
      sparkline: '0,20 10,14 20,18 30,10 40,15 50,6 60,10 70,3',
    },
    {
      id: 'egresos',
      label: 'Egresos totales /mes',
      value: '$1.000.000',
      change: '↘ 9.05%',
      tone: 'danger',
      sparkline: '0,5 10,10 20,7 30,15 40,12 50,18 60,14 70,20',
    },
    {
      id: 'transacciones',
      label: 'Transacciones /mes',
      value: '325',
      change: '↗ 4.30%',
      tone: 'accent',
      sparkline: '0,15 10,10 20,16 30,8 40,12 50,5 60,9 70,4',
    },
  ];
}
