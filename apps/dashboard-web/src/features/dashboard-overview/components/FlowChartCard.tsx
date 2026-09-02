'use client';

import { useState } from 'react';

import { dashboardHome } from '../../../content/es/dashboardHome';
import { formatCOP } from '../../../lib/format';
import { buildChart, type ChartRange } from '../lib/build-chart';

const RANGES: ChartRange[] = ['7D', '30D', '90D'];
const GRID_Y = [0, 65, 130, 195, 259];

/**
 * "Flujo de transacciones" — range toggle + hover tooltip are real,
 * interactive UI (ported from Claude Design's own state model); the
 * underlying series is static (see `lib/build-chart.ts`'s docblock for
 * why). Needs client state (range, hover index), so this is the one
 * client component in the Inicio page's content.
 */
export function FlowChartCard() {
  const [range, setRange] = useState<ChartRange>('7D');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const copy = dashboardHome.flowCard;
  const chart = buildChart(range);
  const stepX = chart.width / (chart.points.length - 1);
  const hoverPoint = hoverIdx !== null ? chart.points[hoverIdx] : null;

  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-[22px] shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16.5px] font-bold text-(--color-fg)">{copy.title}</div>
          <div className="mt-0.5 text-[13px] text-(--color-fg-faint)">{copy.subtitle}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-0.5 rounded-control border border-(--color-border) p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRange(r);
                  setHoverIdx(null);
                }}
                className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold ${
                  range === r ? 'bg-(--color-accent) text-white' : 'text-(--color-fg-soft)'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-(--color-accent-soft) px-2.5 py-1.5 text-[12.5px] font-semibold text-(--color-accent)">
            <span className="h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
            {copy.live}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-[18px]">
        <div className="flex items-center gap-1.5 text-[12.5px] text-(--color-fg-soft)">
          <span className="h-[9px] w-[9px] rounded-full bg-(--color-accent)" />
          {copy.current}
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] text-(--color-fg-soft)">
          <span className="h-[9px] w-[9px] rounded-full bg-(--color-fg-faint)" />
          {copy.previous}
        </div>
      </div>

      <div className="relative mt-2.5">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" className="block w-full">
          {GRID_Y.map((y) => (
            <line key={y} x1={0} y1={y} x2={chart.width} y2={y} stroke="var(--color-grid-line)" strokeWidth={1} />
          ))}
          <path d={chart.areaPath} fill="var(--color-accent)" opacity={0.1} />
          <path
            d={chart.prevLinePath}
            fill="none"
            stroke="var(--color-fg-faint)"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          <path
            d={chart.linePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chart.points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 5 : 0}
                fill="var(--color-accent)"
                style={{ transition: 'r .1s' }}
              />
              <rect
                x={p.x - stepX / 2}
                y={0}
                width={stepX}
                height={chart.height}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            </g>
          ))}
        </svg>

        {hoverPoint ? (
          <div
            className="pointer-events-none absolute min-w-[110px] rounded-lg bg-(--color-fg) px-3 py-2 text-(--color-bg) shadow-toast"
            style={{
              left: `${(hoverPoint.x / chart.width) * 100 > 70 ? (hoverPoint.x / chart.width) * 100 - 15 : (hoverPoint.x / chart.width) * 100}%`,
              top: `${Math.max((hoverPoint.y / chart.height) * 100 - 18, 0)}%`,
            }}
          >
            <div className="text-[11px] opacity-70">{hoverPoint.label}</div>
            <div className="mt-0.5 text-sm font-bold">{formatCOP(hoverPoint.val * 1000)}</div>
            <div className="mt-0.5 text-[11px] opacity-70">Anterior: {formatCOP(hoverPoint.prevVal * 1000)}</div>
          </div>
        ) : null}

        <div className="mt-2 flex justify-between">
          {chart.labels.map((label, i) => (
            <div key={i} className="text-[11.5px] text-(--color-fg-faint)">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
