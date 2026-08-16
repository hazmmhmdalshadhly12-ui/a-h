import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCompetitions, deleteCompetition } from '../../../services/competitionService.js';
import { GRADES } from '../../../config/site.js';
import { formatDateTime, daysUntil } from '../../../utils/formatDate.js';

export default function Competitions() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchCompetitions();
    setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذه المسابقة؟')) return;
    const { error } = await deleteCompetition(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  const columns = [
    { key: 'title', label: 'العنوان', render: (c) => <span className="font-semibold text-paper">{c.title}</span> },
    { key: 'grade', label: 'الصف', render: (c) => <Badge color="muted">{GRADES[c.grade] || c.grade}</Badge> },
    { key: 'deadline', label: 'الموعد النهائي', render: (c) => <span className="text-muted">{formatDateTime(c.deadline)}</span> },
    {
      key: 'left',
      label: 'متبقي',
      render: (c) => {
        const d = daysUntil(c.deadline);
        return <Badge color={d !== null && d < 0 ? 'danger' : d <= 2 ? 'warning' : 'stream'}>{d !== null && d < 0 ? 'انتهت' : `${d} يوم`}</Badge>;
      }
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/admin/competitions/${c.id}`}>
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
        title="المسابقات"
        subtitle="حدد المسابقات ومواعيد انتهائها للطلاب"
        actions={
          <Link to="/admin/competitions/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" /> مسابقة جديدة
            </Button>
          </Link>
        }
      />
      {loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={list} emptyMessage="لا توجد مسابقات" />
      )}
    </div>
  );
}