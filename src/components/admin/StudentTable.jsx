import DataTable from './DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { GRADES } from '../../config/site.js';

export default function StudentTable({ students, onView }) {
  const columns = [
    {
      key: 'name',
      label: 'الاسم',
      render: (s) => (
        <button onClick={() => onView?.(s.id)} className="focus-ring text-right font-semibold text-paper hover:text-signal">
          {s.full_name || '—'}
        </button>
      )
    },
    { key: 'phone', label: 'الموبايل', render: (s) => <span dir="ltr" className="text-muted">{s.phone || '—'}</span> },
    {
      key: 'grade',
      label: 'الصف',
      render: (s) => <Badge color="muted">{GRADES[s.grade] || s.grade}</Badge>
    },
    { key: 'created_at', label: 'تاريخ التسجيل', render: (s) => <span className="text-muted">{formatDateTime(s.created_at)}</span> },
    {
      key: 'actions',
      label: '',
      render: (s) => (
        <Button size="sm" variant="secondary" onClick={() => onView?.(s.id)}>
          عرض الملف
        </Button>
      )
    }
  ];

  return <DataTable columns={columns} rows={students} emptyMessage="لا يوجد طلاب مسجلين" />;
}