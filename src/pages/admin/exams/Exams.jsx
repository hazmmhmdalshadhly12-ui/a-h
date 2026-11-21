import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchAllExams, deleteExam, publishExam, updateExam } from '../../../services/examService.js';
import { formatDateTime } from '../../../utils/formatDate.js';
import { GRADES } from '../../../config/site.js';
import { getFriendlyError } from '../../../utils/errors.js';

export default function Exams() {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchAllExams();
    setExams(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // حذف الامتحان — الخادم يرفض الحذف نهائيًا لو في نتائج طلاب (حارس قاعدة البيانات)،
  // والبديل الآمن لإخفائه عن الطلاب هو "إخفاء" (إلغاء النشر).
  const handleDelete = async (exam) => {
    if (
      !window.confirm(
        `حذف "${exam.title}" نهائيًا وكل أسئلته؟\n\nلو الامتحان عليه نتائج طلاب هيتم رفض الحذف تلقائيًا — استخدم زر "إخفاء" بدلاً منه.`
      )
    )
      return;
    const { error } = await deleteExam(exam.id);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل الحذف'));
      return;
    }
    toast.success('تم الحذف');
    load();
  };

  const togglePublish = async (exam) => {
    const { error } = await publishExam(exam.id, !exam.is_published);
    if (error) return toast.error('فشل التحديث');
    toast.success(exam.is_published ? 'تم إلغاء النشر' : 'تم نشر الامتحان');
    load();
  };

  // تغيير خصوصية الامتحان (عام ↔ خاص) — في أي وقت، بدون حذف أو إعادة إنشاء.
  // المحاولات والنتائج المسجلة لا تتأثر؛ من بدأ محاولة مصرحًا بها يكملها.
  const toggleAccessMode = async (exam) => {
    const nextMode = exam.access_mode === 'public' ? 'subscribers' : 'public';
    const confirmMsg =
      nextMode === 'public'
        ? `تحويل "${exam.title}" إلى امتحان عام؟\n\nهيسمح لكل طلاب الصف المستهدف بدخوله بدون اشتراك.`
        : `تحويل "${exam.title}" إلى امتحان خاص بالمشتركين؟\n\nالطلاب غير المشتركين هيتمنعوا من بدء محاولات جديدة، والمحاولات والنتائج السابقة لا تتأثر.`;
    if (!window.confirm(confirmMsg)) return;
    const { error } = await updateExam(exam.id, { access_mode: nextMode });
    if (error) {
      toast.error(getFriendlyError(error, 'فشل تغيير خصوصية الامتحان'));
      return;
    }
    toast.success(nextMode === 'public' ? 'تم تحويل الامتحان إلى عام' : 'تم تحويل الامتحان إلى خاص بالمشتركين');
    load();
  };

  const columns = [
    { key: 'title', label: 'العنوان', render: (e) => <span className="font-semibold text-paper">{e.title}</span> },
    { key: 'grade', label: 'الصف', render: (e) => <Badge color="muted">{GRADES[e.grade] || e.grade}</Badge> },
    {
      key: 'access_mode',
      label: 'الخصوصية',
      render: (e) =>
        e.access_mode === 'public' ? (
          <Badge color="stream">عام</Badge>
        ) : (
          <Badge color="signal">خاص بالمشتركين</Badge>
        )
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (e) => (e.is_published ? <Badge color="success">منشور</Badge> : <Badge color="warning">مسودة</Badge>)
    },
    { key: 'start', label: 'البداية', render: (e) => <span className="text-muted">{formatDateTime(e.start_at)}</span> },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/admin/exams/${e.id}/results`}>
            <Button size="sm" variant="secondary">
              <Icon name="grades" className="h-3.5 w-3.5" /> النتائج
            </Button>
          </Link>
          <Link to={`/admin/exams/${e.id}`}>
            <Button size="sm" variant="secondary">
              <Icon name="edit" className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant={e.access_mode === 'public' ? 'ghost' : 'secondary'}
            onClick={() => toggleAccessMode(e)}
            title={e.access_mode === 'public' ? 'تحويل إلى خاص بالمشتركين' : 'تحويل إلى عام'}
          >
            {e.access_mode === 'public' ? 'تحويل إلى خاص' : 'تحويل إلى عام'}
          </Button>
          <Button size="sm" variant="success" onClick={() => togglePublish(e)}>
            {e.is_published ? 'إخفاء' : 'نشر'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e)}>
            <Icon name="trash" className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="الامتحانات"
        subtitle="أنشئ الامتحانات، حدد خصوصيتها (عام/خاص)، أضف الأسئلة، وراجع النتائج"
        actions={
          <Link to="/admin/exams/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" /> امتحان جديد
            </Button>
          </Link>
        }
      />
      {loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={exams} emptyMessage="لا توجد امتحانات — أنشئ أول امتحان" />
      )}
    </div>
  );
}
