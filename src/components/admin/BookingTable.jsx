import DataTable from './DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { SUBJECTS } from '../../config/site.js';

export default function BookingTable({ bookings, onUpdateStatus }) {
  const columns = [
    {
      key: 'student',
      label: 'الطالب',
      render: (b) => (
        <div>
          <p className="font-semibold text-paper">{b.profiles?.full_name || '—'}</p>
          <p className="text-xs text-muted" dir="ltr">{b.profiles?.phone || ''}</p>
        </div>
      )
    },
    {
      key: 'datetime',
      label: 'الميعاد',
      render: (b) => <span className="text-paper/90">{formatDateTime(b.requested_datetime)}</span>
    },
    { key: 'subject', label: 'المادة', render: (b) => SUBJECTS[b.subject] || b.subject },
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