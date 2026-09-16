import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Input from '../../../components/ui/Input.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { supabase } from '../../../lib/supabaseClient.js';
import { fetchCourseProgress, fetchStudentLessonProgress } from '../../../services/lessonProgressService.js';
import { getFriendlyError } from '../../../utils/errors.js';
import { formatDateTime } from '../../../utils/formatDate.js';

function formatMinutes(m) {
  if (!m || m === 0) return '0 د';
  if (m < 1) return '< 1 د';
  if (m < 60) return `${Math.round(m)} د`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} س ${r} د` : `${h} س`;
}

export default function CourseProgress() {
  const { courseId } = useParams();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    loadCourse();
    loadProgress();
    loadTotalLessons();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.from('courses').select('id, title, grade').eq('id', courseId).maybeSingle();
    setCourse(data);
  };

  const loadTotalLessons = async () => {
    const { data } = await supabase.from('lessons').select('id').eq('course_id', courseId);
    setTotalLessons((data || []).length);
  };

  const loadProgress = async () => {
    setLoading(true);
    const { data, error } = await fetchCourseProgress(courseId);
    if (error) toast.error(getFriendlyError(error, 'فشل تحميل المتابعة'));
    setRows(data || []);
    setLoading(false);
  };

  const toggle = async (studentId) => {
    if (expanded === studentId) {
      setExpanded(null);
      return;
    }
    setExpanded(studentId);
    setDetailLoading(true);
    const { data, error } = await fetchStudentLessonProgress(courseId, studentId);
    if (error) toast.error(getFriendlyError(error, 'فشل تحميل تفاصيل الطالب'));
    setDetail(data || []);
    setDetailLoading(false);
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return r.full_name?.toLowerCase().includes(s) || r.grade?.toLowerCase().includes(s);
  });

  const openedCount = rows.filter((r) => Number(r.lessons_opened) > 0).length;
  const notOpened = rows.length - openedCount;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={course ? `متابعة: ${course.title}` : 'متابعة الكورس'}
        subtitle="اعرف مين فتح الكورس ومين لسه، وكل طالب شاهد كم دقيقة وآخر مرة فتح"
        actions={
          <Link to={`/admin/courses/${courseId}/manage`}>
            <Button variant="secondary" size="sm">
              <Icon name="edit" className="h-4 w-4" /> إدارة الدروس
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted">إجمالي الطلاب</p>
            <p className="font-display text-2xl font-black">{rows.length}</p>
          </div>
          <Icon name="students" className="h-8 w-8 text-muted" />
        </Card>
        <Card className="flex items-center justify-between p-4 border-success/30 bg-success/5">
          <div>
            <p className="text-xs text-muted">فتحوا الكورس</p>
            <p className="font-display text-2xl font-black text-success">{openedCount}</p>
          </div>
          <Icon name="check" className="h-8 w-8 text-success" />
        </Card>
        <Card className="flex items-center justify-between p-4 border-warning/30 bg-warning/5">
          <div>
            <p className="text-xs text-muted">لم يفتحوا بعد</p>
            <p className="font-display text-2xl font-black text-warning">{notOpened}</p>
          </div>
          <Icon name="eyeOff" className="h-8 w-8 text-warning" />
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            name="q"
            placeholder="ابحث باسم الطالب..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>إجمالي الدروس: {totalLessons}</span>
            <span>•</span>
            <Button variant="ghost" size="sm" onClick={loadProgress}>
              تحديث
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">لا يوجد طلاب — أو لا يوجد تطابق مع البحث.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-xs text-muted">
                  <th className="py-2 font-semibold">الطالب</th>
                  <th className="py-2 font-semibold">الصف</th>
                  <th className="py-2 font-semibold">دروس مفتوحة</th>
                  <th className="py-2 font-semibold">دقائق مشاهدة</th>
                  <th className="py-2 font-semibold">آخر فتح</th>
                  <th className="py-2 font-semibold">الحالة</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <>
                    <tr key={r.student_id} className="border-b border-ink-700/40 hover:bg-ink-800/40">
                      <td className="py-3 font-semibold text-paper">{r.full_name}</td>
                      <td className="py-3">
                        <Badge color="muted">{r.grade}</Badge>
                      </td>
                      <td className="py-3 font-mono text-xs">
                        {r.lessons_opened} / {totalLessons}
                      </td>
                      <td className="py-3 font-bold text-signal">{formatMinutes(Number(r.total_minutes))}</td>
                      <td className="py-3 text-xs text-muted">{r.last_opened ? formatDateTime(r.last_opened) : '—'}</td>
                      <td className="py-3">
                        {Number(r.lessons_opened) > 0 ? (
                          <Badge color="success">فتح</Badge>
                        ) : (
                          <Badge color="warning">لم يفتح</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="xs" onClick={() => toggle(r.student_id)}>
                          {expanded === r.student_id ? 'إخفاء' : 'تفاصيل'}
                        </Button>
                      </td>
                    </tr>
                    {expanded === r.student_id && (
                      <tr>
                        <td colSpan={7} className="bg-ink-900/60 p-0">
                          <div className="p-4">
                            {detailLoading ? (
                              <Skeleton className="h-24" />
                            ) : detail.length === 0 ? (
                              <p className="text-xs text-muted">لا توجد دروس في الكورس.</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {detail.map((d) => (
                                  <div
                                    key={d.lesson_id}
                                    className={`flex items-center justify-between gap-2 rounded-lens border px-3 py-2 ${d.view_count > 0 ? 'border-success/30 bg-success/5' : 'border-ink-700 bg-ink-800/40'}`}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold text-paper">
                                        #{String(d.order_index).padStart(2, '0')} {d.title}
                                      </p>
                                      <p className="text-[11px] text-muted">
                                        {d.view_count > 0 ? `فتح ${d.view_count} مرات` : 'لم يفتح'} • {d.is_free ? 'مجاني' : 'مدفوع'} • آخر فتح: {d.last_opened_at ? formatDateTime(d.last_opened_at) : '—'}
                                      </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="font-mono text-xs font-bold text-signal">{formatMinutes(d.watched_seconds / 60)}</p>
                                      <p className="text-[11px] text-muted">{d.view_count > 0 ? 'شاهد' : 'لم يشاهد'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-ink-600 bg-ink-800/40 p-4">
        <p className="text-xs leading-5 text-muted">
          • التتبع يبدأ عند أول فتح للدرس ويتجمع كل 10 ثواني مشاهدة. الدقائق المعروضة هي مجموع الثواني الفعلية / 60.
          <br />• الطلاب الظاهرون هم طلاب نفس صف الكورس + أي طالب له حجز مؤكد على الكورس (للإحترافي).
        </p>
      </Card>
    </div>
  );
}
