import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchLeaderboard } from '../../services/leaderboardService.js';
import { cn } from '../../lib/utils.js';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile?.grade) return;
    fetchLeaderboard(profile.grade)
      .then(({ data, error: err }) => {
        setRows(Array.isArray(data) ? data : []);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [profile?.grade]);

  const myRow = rows.find((r) => r.student_id === profile?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">لوحة التفوق 🏆</h1>
        <p className="mt-1 text-sm text-muted">
          ترتيب طلاب صفك حسب مجموع درجات الامتحانات المنشورة + درجات الواجبات — المواظبة على الحل بتفرق.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : error ? (
        <Card className="text-center text-sm text-danger">
          حصلت مشكلة في تحميل اللوحة — {error?.message || 'حاول مرة أخرى.'}
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="مفيش نتائج في اللوحة لسه"
          description="حل الامتحانات والواجبات علشان تظهر نقاطك هنا — أول ما المستر ينشر النتيجة."
        />
      ) : (
        <div className="space-y-4">
          {/* مرتبة الطالب الحالي */}
          {myRow && (
            <Card className="border border-signal/50 bg-signal/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-black text-signal">
                    {MEDALS[myRow.student_rank] || `#${myRow.student_rank}`}
                  </span>
                  <div>
                    <p className="font-display font-bold text-paper">ده انت — {profile?.full_name}</p>
                    <p className="text-xs text-muted">
                      {myRow.exams_done} امتحان • {myRow.homeworks_done} واجب
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-display text-2xl font-black text-signal">{myRow.total_points}</p>
                  <p className="text-xs text-muted">نقطة</p>
                </div>
              </div>
            </Card>
          )}

          {/* القائمة */}
          <Card className="divide-y divide-ink-700/60">
            {rows.map((r) => {
              const mine = r.student_id === profile?.id;
              return (
                <div
                  key={r.student_id}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3',
                    mine && 'bg-signal/10'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-10 shrink-0 text-center font-display text-xl font-black text-paper">
                      {MEDALS[r.student_rank] || r.student_rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-paper">
                        {r.full_name || 'طالب'}
                        {mine && <Badge className="mr-1.5" color="signal">انت</Badge>}
                      </p>
                      <p className="text-xs text-muted">
                        {r.exams_done} امتحان • {r.homeworks_done} واجب
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-lg font-black text-signal">{r.total_points}</span>
                    <span className="text-xs text-muted">نقطة</span>
                  </div>
                </div>
              );
            })}
          </Card>

          <p className="flex items-center justify-center gap-2 text-xs text-muted">
            <Icon name="info" className="h-4 w-4" />
            النقاط بتتحسب من النتائج المنشورة بس — التحدي الحقيقي: تفضل في المقدمة 🚀
          </p>
        </div>
      )}
    </div>
  );
}
