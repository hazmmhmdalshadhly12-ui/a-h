import DataTable from './DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatMonth } from '../../utils/formatDate.js';
import { GRADES } from '../../config/site.js';

export default function BookingTable({ bookings, onUpdateStatus }) {
  const columns = [
    {
      key: 'student',
      label: 'الطالب',
      render: (b) => (
        <div>
          <p className="font-semibold text-paper">{b.full_name || b.profiles?.full_name || '—'}</p>
          <p className="text-xs text-muted" dir="ltr">{b.phone || b.profiles?.phone || ''}</p>
          {b.parent_phone && <p className="text-xs text-muted" dir="ltr">ولي الأمر: {b.parent_phone}</p>}
        </div>
      )
    },
    {
      key: 'grade',
      label: 'الصف',
      render: (b) => <span className="text-paper/90">{GRADES[b.grade || b.profiles?.grade] || b.grade || '—'}</span>
    },
    {
      key: 'month',
      label: 'شهر الحجز',
      render: (b) => <span className="text-paper/90">{formatMonth(b.month)}</span>
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (b) => (
        <Badge color={BOOKING_STATUSES[b.status]?.color || 'muted'}>
          {BOOKING_STATUSES[b.status]?.label || b.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="success"
            onClick={() => onUpdateStatus(b.id, 'confirmed')}
            disabled={b.status === 'confirmed'}
          >
            تأكيد
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onUpdateStatus(b.id, 'rejected')}
            disabled={b.status === 'rejected'}
          >
            رفض
          </Button>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} rows={bookings} emptyMessage="لا توجد حجوزات" />;
}