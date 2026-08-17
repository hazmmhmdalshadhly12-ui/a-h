import { useExams } from '../../hooks/useExams.js';
import ExamCard from '../../components/academy/ExamCard.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function Exams() {
  const { exams, loading } = useExams();

  return (
    <SubscriptionGate>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-black">الامتحانات</h1>
          <p className="mt-1 text-sm text-muted">
            امتحان واحد لكل طالب — بمجرد التسليم يتقفل نهائياً من قاعدة البيانات نفسها.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <EmptyState icon="exams" title="لا توجد امتحانات متاحة" description="امتحانات صفك هتظهر هنا لما ينشرها المستر." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        )}
      </div>
    </SubscriptionGate>
  );
}