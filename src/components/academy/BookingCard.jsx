import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { SUBJECTS } from '../../config/site.js';

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
        📅 {formatDateTime(booking.requested_datetime)}
      </p>
      <p className="text-sm text-muted">المادة: {SUBJECTS[booking.subject] || booking.subject}</p>
      {booking.notes && <p className="text-sm text-muted">ملاحظات: {booking.notes}</p>}
    </Card>
  );
}