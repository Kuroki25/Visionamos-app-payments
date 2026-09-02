import type { StatCardDef } from '../../lib/metrics';
import { StatCard } from './StatCard';

export function StatCardsRow({ stats }: { stats: StatCardDef[] }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
