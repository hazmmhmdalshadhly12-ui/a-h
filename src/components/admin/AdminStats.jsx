import StatsCard from '../academy/StatsCard.jsx';

export default function AdminStats({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <StatsCard key={s.label} {...s} />
      ))}
    </div>
  );
}