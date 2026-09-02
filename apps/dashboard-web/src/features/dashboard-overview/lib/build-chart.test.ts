import { describe, expect, it } from 'vitest';

import { buildChart } from './build-chart';

describe('buildChart', () => {
  it('returns one point and one label per day, spanning the declared viewBox width', () => {
    const chart = buildChart('7D');

    expect(chart.points).toHaveLength(8);
    expect(chart.labels).toHaveLength(8);
    expect(chart.points[0]?.x).toBe(0);
    expect(chart.points.at(-1)?.x).toBe(chart.width);
  });

  it('uses different day labels per range', () => {
    expect(buildChart('7D').labels).toContain('Hoy');
    expect(buildChart('30D').labels).toContain('S8');
    expect(buildChart('90D').labels).toContain('E8');
  });

  it('scales values up for longer ranges', () => {
    const short = buildChart('7D').points[0]?.val ?? 0;
    const long = buildChart('90D').points[0]?.val ?? 0;

    expect(long).toBeGreaterThan(short);
  });

  it('keeps every point within the chart height', () => {
    for (const range of ['7D', '30D', '90D'] as const) {
      for (const point of buildChart(range).points) {
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(260);
      }
    }
  });
});
