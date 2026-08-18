import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  fetchParentStudents,
  fetchStudentGradesForParent,
  fetchStudentExamStatus,
  fetchStudentHomeworkStatus,
  fetchStudentCourseAccess,
  fetchStudentAccess
} from '../../services/parentService.js';
import { getFriendlyError } from '../../utils/errors.js';
import { GRADE_SHORT } from '../../config/site.js';
import { formatDate } from '../../utils/formatDate.js';

export default function ParentStudentDetails() {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchParentStudents(),
      fetchStudentExamStatus(studentId),
      fetchStudentHomeworkStatus(studentId),
      fetchStudentGradesForParent(studentId),
      fetchStudentCourseAccess(studentId),
      fetchStudentAccess(studentId)
    ])
      .then(([s, ex, hw, gr, cs, ac]) => {
        if (s.error) {
          setError(s.error);
          return;
        }
        const found = Array.isArray(s.data) ? s.data.find((x) => x.student_id === studentId) : null;
        setStudent(found || null);
        setExams(Array.isArray(ex.data) ? ex.data : []);
        setHomeworks(Array.isArray(hw.data) ? hw.data : []);
        setGrades(Array.isArray(gr.data) ? gr.data : []);
        setCourses(Array.isArray(cs.data) ? cs.data : []);
        setAccess(Array.isArray(ac.data) ? ac.data : []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">{error ? getFriendlyError(error, 'غير مسموح بمتابعة هذا الطالب') : 'الطالب غير موجود في حسابك.'}</p>
        <Link to="/parent/dashboard">
          <Button variant="secondary">رجوع لأولادي</Button>
        </Link>
      </Card>
    );
  }

  const submittedExams = exams.filter((e) => e.submitted);
  const releasedExams = grades.length;
  const submittedHomeworks = homeworks.filter((h) => h.submitted);
  const accessibleCourses = courses.filter((c) => c.accessible);
  const months = access.filter((a) => a.kind === 'booking' || a.kind === 'grant');
  const proCourses = access.filter((a) => a.kind === 'course');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">{student.full_name || 'الطالب'}</h1>
          <p className="mt-1 text-sm text-muted">
            <span dir="ltr">{student.phone}</span>
            {student.grade && <span> • {GRADE_SHORT[student.grade] || student.grade}</span>}
          </p>
        </div>
        <Link to="/parent/dashboard">
          <Button variant="secondary" size="sm">
            <Icon name="chevronRight" className="h-4 w-4" /> أولادي
          </Button>
        </Link>
      </div>

      {/* نظرة عامة */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="exams" label="امتحانات صفّه" value={exams.length} sub={`سلّم ${submittedExams.length}`} />
        <StatCard icon="grades" label="نتائج ظهرت" value={releasedExams} sub="منشورة من المستر" />
        <StatCard icon="edit" label="واجبات" value={homeworks.length} sub={`سلّم ${submittedHomeworks.length}`} />
        <StatCard icon="courses" label="كورسات متاحة" value={accessibleCourses.length} sub={`من ${courses.length}`} />
      </div>

      {/* الامتحانات */}
      <section className="space-y-3">
        <SectionTitle icon="exams" title={`حالة الامتحانات (${exams.length})`} />
        {exams.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد امتحانات منشورة لصفه حالياً.</Card>
        ) : (
          <Card className="divide-y divide-ink-700/60">
            {exams.map((e) => (
              <div key={e.exam_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-paper">{e.title}</p>
                  <p className="text-xs text-muted">
                    {e.submitted ? `سلّم في ${formatDate(e.submitted_at)}` : 'لم يُسلَّم بعد'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {e.submitted && e.grade_released && e.score != null ? (
                    <Badge color="success">الدرجة: {e.score}</Badge>
                  ) : e.submitted ? (
                    <Badge color="warning">قيد المراجعة</Badge>
                  ) : (
                    <Badge color="muted">لم يُسلَّم</Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* الواجبات */}
      <section className="space-y-3">
        <SectionTitle icon="edit" title={`حالة الواجبات (${homeworks.length})`} />
        {homeworks.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد واجبات في الكورسات حالياً.</Card>
        ) : (
          <Card className="divide-y divide-ink-700/60">
            {homeworks.map((h) => (
              <div key={h.homework_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-paper">{h.title}</p>
                  <p className="text-xs text-muted">كورس: {h.course_title || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {h.submitted ? (
                    <Badge color="success">تم التسليم — {h.auto_score}/{h.total_points}</Badge>
                  ) : (
                    <Badge color="muted">لم يُسلَّم</Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* الدرجات */}
      <section className="space-y-3">
        <SectionTitle icon="grades" title={`الدرجات (${grades.length})`} />
        {grades.length === 0 ? (
          <Card className="text-sm text-muted">
            لا توجد نتائج منشورة بعد — هتظهر أول ما المستر يراجع ويعلن النتيجة.
          </Card>
        ) : (
          <Card className="divide-y divide-ink-700/60">
            {grades.map((g) => (
              <div key={g.exam_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-paper">{g.exam_title}</p>
                  <p className="text-xs text-muted">سلّم في {formatDate(g.submitted_at)}</p>
                </div>
                <span className="font-display text-xl font-black text-signal">{g.score ?? '—'}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* الكورسات */}
      <section className="space-y-3">
        <SectionTitle icon="courses" title={`حالة الكورسات (${accessibleCourses.length} متاح من ${courses.length})`} />
        {courses.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد كورسات لصفه بعد.</Card>
        ) : (
          <Card className="divide-y divide-ink-700/60">
            {courses.map((c) => (
              <div key={c.course_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-paper">{c.title}</p>
                  <p className="text-xs text-muted">{GRADE_SHORT[c.grade] || c.grade}</p>
                </div>
                {c.accessible ? (
                  <Badge color="success">متاح ✓</Badge>
                ) : c.grade === 'professional' ? (
                  <Badge color="warning">غير مشترك</Badge>
                ) : (
                  <Badge color="muted">غير متاح</Badge>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* ملخص الاشتراك */}
      <section className="space-y-3">
        <SectionTitle icon="bookings" title="ملخص الاشتراك" />
        {months.length === 0 && proCourses.length === 0 ? (
          <Card className="text-sm text-muted">لم يتم تأكيد أي حجز للطالب بعد.</Card>
        ) : (
          <Card className="space-y-2.5">
            {months.map((m) => (
              <p key={m.ref_id} className="text-sm text-paper">
                <Icon name="check" className="ml-1 inline h-4 w-4 text-success" />
                {m.kind === 'grant' ? 'شهر مفتوح يدوياً: ' : 'اشتراك شهر: '}
                <b>{m.month}</b>
              </p>
            ))}
            {proCourses.map((c) => (
              <p key={c.ref_id} className="text-sm text-paper">
                <Icon name="lock" className="ml-1 inline h-4 w-4 text-warning" />
                مشترك في الكورس الاحترافي: <b>{c.course_title}</b>
              </p>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-signal/15 text-signal">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl font-black text-paper">{value}</p>
        <p className="text-xs text-muted">{label}</p>
        {sub && <p className="text-[11px] text-muted/70">{sub}</p>}
      </div>
    </Card>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon} className="h-5 w-5 text-signal" />
      <h2 className="font-display text-lg font-bold">{title}</h2>
    </div>
  );
}