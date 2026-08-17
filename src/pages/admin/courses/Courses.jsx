import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCourses, deleteCourse } from '../../../services/courseService.js';
import { GRADES } from '../../../config/site.js';

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchCourses();
    setCourses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا الدرس؟')) return;
    const { error } = await deleteCourse(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  const columns = [
    {
      key: 'order',
      label: '#',
      render: (c) => <span className="font-mono text-muted">{String(c.order_index || 1).padStart(2, '0')}</span>
    },
    { key: 'title', label: 'العنوان', render: (c) => <span className="font-semibold text-paper">{c.title}</span> },
    { key: 'grade', label: 'الصف', render: (c) => <Badge color="muted">{GRADES[c.grade] || c.grade}</Badge> },
    {
      key: 'section',
      label: 'القسم',
      render: (c) => (c.section ? <Badge color="stream">{c.section.title}</Badge> : <span className="text-muted">بدون</span>)
    },
    {
      key: 'video',
      label: 'فيديو',
      render: (c) => (c.video_url ? <Badge color="success">موجود</Badge> : <Badge color="warning">بدون</Badge>)
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/admin/courses/${c.id}/manage`}>
            <Button size="sm" variant="secondary">
              <Icon name="courses" className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to={`/admin/courses/${c.id}`}>
            <Button size="sm" variant="secondary">
              <Icon name="edit" className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)}>
            <Icon name="trash" className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="الكورسات"
        subtitle="الفيديوهات مقسمة حسب الصف والترتيب"
        actions={
          <Link to="/admin/courses/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" /> درس جديد
            </Button>
          </Link>
        }
      />
      {loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={courses} emptyMessage="لا توجد كورسات" />
      )}
    </div>
  );
}