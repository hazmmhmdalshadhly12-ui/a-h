import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { fetchStudentById, updateStudentRole } from '../../../services/profileService.js';
import { fetchSubmissionsForStudent } from '../../../services/submissionService.js';
import { GRADES } from '../../../config/site.js';
import { formatDateTime } from '../../../utils/formatDate.js';

export default function StudentDetails() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, sub] = await Promise.all([fetchStudentById(studentId), fetchSubmissionsForStudent(studentId)]);
    setStudent(s.data);
    setSubmissions(sub.data || []);
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

  if (loading) return <Card className="text-center text-muted">جارٍ التحميل...</Card>;

  if (!student) {
    return <Card className="text-center text-danger">الطالب غير موجود.</Card>;
  }

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
    </div>
  );
}