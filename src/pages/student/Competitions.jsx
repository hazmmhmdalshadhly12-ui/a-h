import { useAuth } from '../../hooks/useAuth.js';
import { useCompetitions } from '../../hooks/useCompetitions.js';
import CompetitionCard from '../../components/academy/CompetitionCard.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function Competitions() {
  const { profile } = useAuth();
  const { competitions, loading } = useCompetitions(profile?.grade);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">المسابقات</h1>
        <p className="mt-1 text-sm text-muted">تحديات برمجية لصفك — شارك قبل الموعد النهائي.</p>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : competitions.length === 0 ? (
        <EmptyState icon="competitions" title="لا توجد مسابقات حالياً" description="أول مسابقة هتظهر هنا." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => (
            <CompetitionCard key={c.id} competition={c} />
          ))}
        </div>
      )}
    </div>
  );
}