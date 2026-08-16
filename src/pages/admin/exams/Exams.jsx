import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchAllExams, deleteExam, publishExam } from '../../../services/examService.js';
import { formatDateTime } from '../../../utils/formatDate.js';
import { GRADES } from '../../../config/site.js';

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

  const handleDelete = async (id) => {
    if (!window.confirm('متأكد من حذف هذا الامتحان وكل أسئلته؟')) return;
    const { error } = await deleteExam(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  const togglePublish = async (exam) => {
    const { error } = await publishExam(exam.id, !exam.is_published);
    if (error) return toast.error('فشل التحديث');
    toast.success(exam.is_published ? 'تم إلغاء النشر' : 'تم نشر الامتحان');
    load();
  };

  const columns = [
    { key: 'title', label: 'العنوان', render: (e) => <span className="font-semibold text-paper">{e.title}</span> },
    { key: 'grade', label: 'الصف', render: (e) => <Badge color="muted">{GRADES[e.grade] || e.grade}</Badge> },
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
          <Button size="sm" variant="success" onClick={() => togglePublish(e)}>
            {e.is_published ? 'إخفاء' : 'نشر'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e.id)}>
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
        subtitle="أنشئ الامتحانات، أضف الأسئلة، وراجع النتائج"
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
