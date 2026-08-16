import { useAuth } from '../../hooks/useAuth.js';
import { useCourses } from '../../hooks/useCourses.js';
import CourseCard from '../../components/academy/CourseCard.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function MyCourses() {
  const { profile } = useAuth();
  const { courses, loading } = useCourses(profile?.grade);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">الكورسات الكاملة</h1>
        <p className="mt-1 text-sm text-muted">فيديوهات شرح كاملة لصفك — بشاهدتها بالترتيب.</p>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState icon="courses" title="لا توجد كورسات بعد" description="سيضيف المستر الكورسات قريباً لصفك." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}