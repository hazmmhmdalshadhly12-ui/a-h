import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCourse } from '../../hooks/useCourses.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import { fetchCourseLessons, fetchCourseHomeworks } from '../../services/courseService.js';
import { GRADE_SHORT } from '../../config/site.js';
import { cn } from '../../lib/utils.js';

export default function CourseDetails() {
  const { courseId } = useParams();
  const { course, loading } = useCourse(courseId);
  const { profile } = useAuth();

  const [lessons, setLessons] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    setExtraLoading(true);
    Promise.all([fetchCourseLessons(courseId), fetchCourseHomeworks(courseId)]).then(([l, h]) => {
      const lessonList = Array.isArray(l.data) ? l.data : [];
      const hwList = Array.isArray(h.data) ? h.data : [];
      setLessons(lessonList);
      setHomeworks(hwList);
      setActiveLessonId(lessonList[0]?.lesson_id || null);
      setExtraLoading(false);
    });
  }, [courseId]);

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

  const isMyGrade = profile?.grade === course.grade;
  const canWatch = Boolean(profile) && isMyGrade;
  const activeLesson = lessons.find((l) => l.lesson_id === activeLessonId);
  const videoUrl = activeLesson?.video_url || course.video_url;

  return (
    <SubscriptionGate>
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

        {course.image_url && (
          <div className="overflow-hidden rounded-lens">
            <img src={course.image_url} alt={course.title} className="max-h-64 w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* المحاضرات */}
          <Card className="overflow-hidden lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-3">
              <Icon name="play" className="h-4 w-4 text-signal" />
              <p className="font-display text-sm font-bold text-paper">المحاضرات ({lessons.length})</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {extraLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : lessons.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">لا توجد محاضرات بعد — تابعنا.</p>
              ) : (
                <ul>
                  {lessons.map((l, i) => (
                    <li key={l.lesson_id}>
                      <button
                        type="button"
                        onClick={() => setActiveLessonId(l.lesson_id)}
                        className={cn(
                          'focus-ring flex w-full items-start gap-3 border-b border-ink-700/50 px-4 py-3 text-right transition hover:bg-ink-800/60',
                          activeLessonId === l.lesson_id && 'bg-signal/10'
                        )}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-muted">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-paper">{l.title}</span>
                          {l.video_url && <span className="block text-xs text-muted">فيديو ✓</span>}
                        </span>
                        {activeLessonId === l.lesson_id && <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-signal" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* الفيديو والوصف */}
          <div className="space-y-6 lg:col-span-2">
            <div className="card-panel overflow-hidden rounded-lens">
              {canWatch && videoUrl ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={videoUrl}
                    title={activeLesson?.title || course.title}
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
        </div>

        {/* الواجبات */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="edit" className="h-5 w-5 text-signal" />
            <h2 className="font-display text-lg font-bold">واجبات الدرس ({homeworks.length})</h2>
          </div>

          {extraLoading ? (
            <Skeleton className="h-24" />
          ) : homeworks.length === 0 ? (
            <Card className="text-sm text-muted">لا توجد واجبات في هذا الدرس حالياً.</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homeworks.map((h) => (
                <Card key={h.homework_id} className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lens bg-signal/15 text-signal">
                      <Icon name="edit" className="h-5 w-5" />
                    </div>
                    {h.submitted ? (
                      <Badge color="success">تم التسليم — {h.score}/{h.total_points}</Badge>
                    ) : (
                      <Badge color="warning">لم يُسلّم</Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-paper">{h.title}</h3>
                    {h.description && <p className="mt-1 text-sm text-muted line-clamp-2">{h.description}</p>}
                  </div>
                  <div className="mt-auto pt-1">
                    {h.submitted ? (
                      <p className="text-sm font-semibold text-success">اتصحح وظهرت نتيجتك ✓</p>
                    ) : (
                      <Link to={`/student/courses/${courseId}/homework/${h.homework_id}`}>
                        <Button size="sm" className="w-full">
                          حل الواجب
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </SubscriptionGate>
  );
}