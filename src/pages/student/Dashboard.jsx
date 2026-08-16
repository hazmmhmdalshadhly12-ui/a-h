import { Link } from 'react-router-dom';
import StatsCard from '../../components/academy/StatsCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useExams } from '../../hooks/useExams.js';
import { useBookings } from '../../hooks/useBookings.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { GRADES } from '../../config/site.js';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatDateTime } from '../../utils/formatDate.js';

export default function Dashboard() {
  const { profile } = useAuth();
  const { exams, loading: examsLoading } = useExams();
  const { bookings, loading: bookingsLoading } = useBookings();
  const { unreadCount } = useNotifications();

  const availableExams = exams.filter((e) => !e.submitted).length;
  const submittedExams = exams.filter((e) => e.submitted).length;
  const lastBooking = bookings[0];
  const lastBookingStatus = lastBooking ? BOOKING_STATUSES[lastBooking.status]?.label : 'لا يوجد حجز بعد';

  return (
    <div className="space-y-6">
      {/* ترحيب */}
      <div className="card-panel flex flex-wrap items-center justify-between gap-4 rounded-lens p-6">
        <div>
          <p className="text-sm text-muted">أهلاً بيك من جديد 👋</p>
          <h1 className="font-display text-2xl font-black">{profile?.full_name}</h1>
          <p className="mt-1 text-sm text-muted">{GRADES[profile?.grade]}</p>
        </div>
        <Link
          to="/student/exams"
          className="focus-ring rounded-lens border border-signal/50 bg-signal/10 px-4 py-2.5 text-sm font-bold text-signal hover:bg-signal/20"
        >
          حل امتحان جديد
        </Link>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="امتحانات متاحة" value={availableExams} icon="exams" color="signal" />
        <StatsCard label="تم تسليمها" value={submittedExams} icon="check" color="success" />
        <StatsCard label="إشعارات غير مقروءة" value={unreadCount} icon="notifications" color="warning" />
        <StatsCard label="آخر حجز" value={lastBooking ? BOOKING_STATUSES[lastBooking.status]?.label : '—'} icon="bookings" color="stream" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* آخر الامتحانات */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">آخر الامتحانات</h2>
            <Link to="/student/exams" className="text-sm text-signal hover:text-signal-light">
              الكل ←
            </Link>
          </div>
          {examsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">لا توجد امتحانات لصفك حالياً</p>
          ) : (
            <ul className="divide-y divide-ink-700/60">
              {exams.slice(0, 3).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-paper">{e.title}</p>
                    <p className="text-xs text-muted">{e.end_at ? formatDateTime(e.end_at) : 'بدون وقت نهائي'}</p>
                  </div>
                  <Badge color={e.submitted ? 'stream' : 'signal'}>{e.submitted ? 'تم التسليم' : 'متاح'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* آخر حجز */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">حالة آخر حجز</h2>
            <Link to="/student/bookings" className="text-sm text-signal hover:text-signal-light">
              كل الحجوزات ←
            </Link>
          </div>
          {bookingsLoading ? (
            <Skeleton className="h-14" />
          ) : lastBooking ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-paper">📅 {formatDateTime(lastBooking.requested_datetime)}</p>
              <Badge color={BOOKING_STATUSES[lastBooking.status]?.color || 'muted'}>
                {BOOKING_STATUSES[lastBooking.status]?.label || lastBooking.status}
              </Badge>
              {lastBooking.notes && <p className="text-sm text-muted">{lastBooking.notes}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted">لسه محجزش حصة — احجز واجب الحجز من لوحة الحجوزات.</p>
              <Link to="/student/bookings" className="focus-ring rounded-lens border border-signal/50 px-4 py-2 text-sm font-bold text-signal">
                احجز حصة
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}