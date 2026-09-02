export type ChartRange = '7D' | '30D' | '90D';

export interface ChartPoint {
  x: number;
  y: number;
  val: number;
  /** Same index's previous-period value and day label, carried on the point itself so hover UI doesn't need a second, separately-checked array index (`noUncheckedIndexedAccess`). */
  prevVal: number;
  label: string;
}

export interface ChartData {
  linePath: string;
  prevLinePath: string;
  areaPath: string;
  points: ChartPoint[];
  labels: string[];
  width: number;
  height: number;
}

const LABELS: Record<ChartRange, string[]> = {
  '7D': ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Hoy'],
  '30D': ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
  '90D': ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'],
};

const SCALE: Record<ChartRange, number> = { '7D': 1, '30D': 1.35, '90D': 1.7 };
const BASE_CUR = [320, 480, 300, 620, 430, 700, 560, 810];
const BASE_PREV = [280, 350, 340, 480, 400, 520, 470, 610];
const WIDTH = 660;
const HEIGHT = 260;

/**
 * Ports Claude Design's `buildChart()` (same series/pixel math) — no
 * backend aggregate endpoint exists for "flujo de transacciones" yet, see
 * `api/get-overview-metrics.ts`'s docblock for the same caveat. Pure
 * function so `FlowChartCard` only has to manage range/hover UI state.
 */
export function buildChart(range: ChartRange): ChartData {
  const scale = SCALE[range];
  const cur = BASE_CUR.map((v) => Math.min(860, v * (scale * 0.55 + 0.45)));
  const stepX = WIDTH / (cur.length - 1);
  const toY = (v: number) => HEIGHT - (v / 900) * (HEIGHT - 20) - 6;

  const labels = LABELS[range];
  const points: ChartPoint[] = cur.map((v, i) => ({
    x: i * stepX,
    y: toY(v),
    val: v,
    prevVal: BASE_PREV[i] ?? 0,
    label: labels[i] ?? '',
  }));
  const prevPoints = BASE_PREV.map((v, i) => ({ x: i * stepX, y: toY(v) }));

  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const linePath = toPath(points);

  return {
    linePath,
    prevLinePath: toPath(prevPoints),
    areaPath: `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`,
    points,
    labels,
    width: WIDTH,
    height: HEIGHT,
  };
}
