import { getStaticStatCards } from '../api/get-overview-metrics';
import { StatCard } from './StatCard';

export function StatCardsRow() {
  const statCards = getStaticStatCards();
  return (
    <div className="mb-4 grid grid-cols-3 gap-4">
      {statCards.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
