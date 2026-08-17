import { useAuth } from '../../hooks/useAuth.js';
import { useStudentCourses } from '../../hooks/useCourses.js';
import { useAccess } from '../../hooks/useAccess.js';
import CourseCard from '../../components/academy/CourseCard.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Card from '../../components/ui/Card.jsx';
import { GRADE_SHORT } from '../../config/site.js';

export default function MyCourses() {
  const { profile } = useAuth();
  const { courses, loading } = useStudentCourses(profile?.grade);
  const { confirmed } = useAccess();

  // تجميع الكورسات حسب القسم — الكورسات من غير قسم بتتحط في "كورسات عامة"
  const groups = [];
  const map = new Map();
  for (const c of courses) {
    const key = c.section_id || 'general';
    if (!map.has(key)) {
      map.set(key, { id: key, title: c.section_title || 'كورسات عامة', grade: c.section_grade || null, items: [] });
      groups.push(map.get(key));
    }
    map.get(key).items.push(c);
  }
  groups.sort((a, b) => (a.id === 'general' ? 1 : b.id === 'general' ? -1 : 0));

  const accessibleCount = courses.filter((c) => c.accessible).length;

  return (
    <SubscriptionGate>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-black">الكورسات الكاملة</h1>
            <p className="mt-1 text-sm text-muted">فيديوهات شرح كاملة لصفك — بشاهدها بالترتيب حسب الأقسام.</p>
          </div>
          {confirmed && <Badge color="success">اشتراكك مفعّل ✓ ({accessibleCount} كورس متاح)</Badge>}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState icon="courses" title="لا توجد كورسات بعد" description="سيضيف المستر الكورسات قريباً لصفك." />
        ) : (
          groups.map((g) => (
            <section key={g.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lens bg-stream/15 text-stream">
                  <Icon name="courses" className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-paper">{g.title}</h2>
                  {g.grade && <p className="text-xs text-muted">{GRADE_SHORT[g.grade]}</p>}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((c) => (
                  <CourseCard key={c.course_id} course={c} locked={!c.accessible} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </SubscriptionGate>
  );
}