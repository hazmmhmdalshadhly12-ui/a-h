import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatMonth } from '../../utils/formatDate.js';
import { GRADES } from '../../config/site.js';

export default function BookingCard({ booking }) {
  const status = BOOKING_STATUSES[booking.status] || BOOKING_STATUSES.pending;
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <Badge color={status.color}>{status.label}</Badge>
        <span className="font-mono text-xs text-muted">
          {new Date(booking.created_at || Date.now()).toLocaleDateString('ar-EG')}
        </span>
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        📅 حجز شهر: {formatMonth(booking.month)}
      </p>
      <p className="text-sm text-muted">الصف: {GRADES[booking.grade] || booking.grade || '—'}</p>
      <p className="text-sm text-muted">الاسم: {booking.full_name || '—'}</p>
      <p className="text-sm text-muted" dir="ltr">موبايل: {booking.phone || '—'}</p>
      {booking.parent_phone && <p className="text-sm text-muted" dir="ltr">ولي الأمر: {booking.parent_phone}</p>}
      {booking.notes && <p className="text-sm text-muted">ملاحظات: {booking.notes}</p>}
    </Card>
  );
}