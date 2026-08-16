import { useParams, Link } from 'react-router-dom';
import { useCourse } from '../../hooks/useCourses.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { GRADE_SHORT } from '../../config/site.js';

export default function CourseDetails() {
  const { courseId } = useParams();
  const { course, loading } = useCourse(courseId);
  const { profile } = useAuth();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!course) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">الكورس ده مش موجود.</p>
        <Link to="/student/courses">
          <Button variant="secondary">رجوع للكورسات</Button>
        </Link>
      </Card>
    );
  }

  // الفيديوهات الكاملة للطلاب المسجلين فقط
  const isMyGrade = profile?.grade === course.grade;
  const canWatch = profile && isMyGrade;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stream">#{String(course.order_index || 1).padStart(2, '0')} — {GRADE_SHORT[course.grade]}</p>
          <h1 className="mt-1 font-display text-2xl font-black">{course.title}</h1>
        </div>
        <Link to="/student/courses">
          <Button variant="secondary" size="sm">
            <Icon name="chevronRight" className="h-4 w-4" /> كل الكورسات
          </Button>
        </Link>
      </div>

      <div className="card-panel overflow-hidden rounded-lens">
        {canWatch && course.video_url ? (
          <div className="aspect-video w-full">
            <iframe
              src={course.video_url}
              title={course.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-ink-900/60">
            <Icon name="eye" className="h-12 w-12 text-signal/60" />
            <p className="font-display text-lg font-bold text-paper">
              {canWatch ? 'لا يوجد فيديو لهذا الدرس بعد' : 'الفيديو متاح لطلاب هذا الصف فقط'}
            </p>
            {!canWatch && (
              <p className="max-w-md text-center text-sm text-muted">
                الكورسات الكاملة متاحة للطلاب المسجلين في الصف المطابق. سجّل حسابك أو تواصل مع المستر لو محتاج وصول.
              </p>
            )}
          </div>
        )}
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold">عن هذا الدرس</h2>
        <p className="mt-2 leading-relaxed text-muted">{course.description || 'لا يوجد وصف بعد.'}</p>
      </Card>
    </div>
  );
}