import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Input from '../../../components/ui/Input.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { fetchStudentById, updateStudentRole, fetchStudentAccess, addStudentMonthGrant, removeStudentMonthGrant } from '../../../services/profileService.js';
import { fetchSubmissionsForStudent } from '../../../services/submissionService.js';
import { GRADES } from '../../../config/site.js';
import { formatDateTime, formatMonth } from '../../../utils/formatDate.js';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function StudentDetails() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [access, setAccess] = useState([]);
  const [grantMonth, setGrantMonth] = useState(currentMonth());
  const [granting, setGranting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, sub, acc] = await Promise.all([
      fetchStudentById(studentId),
      fetchSubmissionsForStudent(studentId),
      fetchStudentAccess(studentId)
    ]);
    setStudent(s.data);
    setSubmissions(sub.data || []);
    setAccess(acc.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [studentId]);

  const toggleAdmin = async () => {
    if (studentId === profile?.id) return toast.error('مش بتقدر تغير صلاحية حسابك من هنا');
    const nextRole = student.role === 'admin' ? 'student' : 'admin';
    if (nextRole === 'admin' && !window.confirm('رفع هذا الطالب لمنصب أدمن؟')) return;
    const { error } = await updateStudentRole(studentId, nextRole);
    if (error) return toast.error('فشل التحديث');
    toast.success('تم تحديث الصلاحية');
    load();
  };

  const grantMonthNow = async () => {
    if (!grantMonth) return toast.error('اختر الشهر الأول');
    setGranting(true);
    const { error } = await addStudentMonthGrant(studentId, grantMonth);
    setGranting(false);
    if (error) return toast.error('فشل فتح الشهر — قد يكون مفتوحاً بالفعل');
    toast.success(`تم فتح شهر ${formatMonth(grantMonth)} للطالب`);
    load();
  };

  const revokeGrant = async (grantId) => {
    if (!window.confirm('إغلاق هذا الشهر على الطالب؟')) return;
    const { error } = await removeStudentMonthGrant(grantId);
    if (error) return toast.error('فشل الإغلاق');
    toast.success('تم الإغلاق');
    load();
  };

  if (loading) return <Card className="text-center text-muted">جارٍ التحميل...</Card>;

  if (!student) {
    return <Card className="text-center text-danger">الطالب غير موجود.</Card>;
  }

  const grants = access.filter((a) => a.kind === 'grant');
  const confirmedMonths = access.filter((a) => a.kind === 'booking').map((a) => a.month).filter(Boolean);
  const confirmedCourses = access.filter((a) => a.kind === 'course');

  return (
    <div className="space-y-6">
      <AdminHeader
        title={student.full_name || 'طالب'}
        subtitle={GRADES[student.grade] || student.grade}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/admin/chat?student=${studentId}`}>
              <Button size="sm">
                <Icon name="chat" className="h-4 w-4" /> شات مع الطالب
              </Button>
            </Link>
            <Link to="/admin/students">
              <Button size="sm" variant="secondary">
                <Icon name="chevronRight" className="h-4 w-4" /> كل الطلاب
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">بيانات الطالب</h2>
          <p className="flex items-center gap-2 text-sm text-muted"><Icon name="mail" className="h-4 w-4" /> {student.email || '—'}</p>
          <p className="flex items-center gap-2 text-sm text-muted" dir="ltr"><Icon name="phone" className="h-4 w-4" /> {student.phone || '—'}</p>
          <p className="flex items-center gap-2 text-sm text-muted" dir="ltr"><Icon name="phone" className="h-4 w-4" /> ولي الأمر: {student.parent_phone || '—'}</p>
          <p className="flex items-center gap-2 text-sm text-muted"><Icon name="calendar" className="h-4 w-4" /> سجّل في: {formatDateTime(student.created_at)}</p>
          <Badge color={student.role === 'admin' ? 'danger' : 'stream'}>{student.role === 'admin' ? 'أدمن' : 'طالب'}</Badge>
          <div className="pt-2">
            <Button size="sm" variant="secondary" onClick={toggleAdmin}>
              {student.role === 'admin' ? 'تحويل لطالب' : 'ترقية لأدمن'}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">الوصول الحالي للطالب</h2>
            <p className="mt-1 text-xs text-muted">الأشهر المفتوحة (حجز مؤكد أو فتح يدوي) — الكورسات الاحترافية المؤكدة.</p>
          </div>

          {(confirmedMonths.length > 0 || grants.length > 0) && (
            <ul className="divide-y divide-ink-700/60">
              {confirmedMonths.map((m) => (
                <li key={`b-${m}`} className="flex items-center justify-between py-2">
                  <span className="text-sm text-paper">📅 {formatMonth(m)}</span>
                  <Badge color="success">حجز مؤكد</Badge>
                </li>
              ))}
              {grants.map((g) => (
                <li key={g.ref_id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-paper">🔓 {formatMonth(g.month)}</span>
                  <div className="flex items-center gap-2">
                    <Badge color="stream">فتح يدوي</Badge>
                    <Button size="xs" variant="danger" onClick={() => revokeGrant(g.ref_id)}>
                      إغلاق
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {confirmedCourses.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted">كورسات احترافية مؤكدة:</p>
              <ul className="divide-y divide-ink-700/60">
                {confirmedCourses.map((c) => (
                  <li key={c.ref_id} className="py-2 text-sm text-paper">⭐ {c.course_title}</li>
                ))}
              </ul>
            </div>
          )}

          {confirmedMonths.length === 0 && grants.length === 0 && confirmedCourses.length === 0 && (
            <p className="text-sm text-muted">لا يوجد وصول مفتوح للطالب حالياً.</p>
          )}

          <div className="rounded-lens bg-ink-800/60 p-3">
            <p className="mb-2 text-sm font-bold text-paper">فتح شهر يدوياً</p>
            <div className="flex items-end gap-2">
              <Input
                name="grant_month"
                label="الشهر"
                type="month"
                value={grantMonth}
                onChange={(e) => setGrantMonth(e.target.value)}
              />
              <Button size="sm" onClick={grantMonthNow} loading={granting}>
                فتح
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">يفتح الشهر ده للطالب حتى لو كان قديم أو مش محجوز — زي ما تحب.</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">الامتحانات المُسلّمة ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted">لم يسلم أي امتحان بعد.</p>
        ) : (
          <ul className="divide-y divide-ink-700/60">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-paper">{s.exams?.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(s.submitted_at)}</p>
                </div>
                <span className="font-display font-bold text-signal">
                  {s.grade_released ? `${s.score ?? '—'} نقطة` : 'قيد المراجعة'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}