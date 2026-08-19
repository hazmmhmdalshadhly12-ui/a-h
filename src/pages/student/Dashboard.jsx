import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatsCard from '../../components/academy/StatsCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import DashboardCustomizer from '../../components/student/DashboardCustomizer.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAccess } from '../../hooks/useAccess.js';
import { useExams } from '../../hooks/useExams.js';
import { useBookings } from '../../hooks/useBookings.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { useStudentPrefs } from '../../context/StudentPrefsContext.jsx';
import { fetchAnnouncements } from '../../services/announcementService.js';
import { GRADES } from '../../config/site.js';
import { BOOKING_STATUSES } from '../../config/constants.js';
import { formatDateTime, formatMonth, formatDate } from '../../utils/formatDate.js';

export default function Dashboard() {
  const { profile } = useAuth();
  const { confirmed, loading: accessLoading } = useAccess();
  const { exams, loading: examsLoading } = useExams();
  const { bookings, loading: bookingsLoading } = useBookings();
  const { unreadCount } = useNotifications();
  const { layout } = useStudentPrefs();
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const isProfessional = profile?.grade === 'professional';

  useEffect(() => {
    fetchAnnouncements().then(({ data }) => {
      setAnnouncements(data || []);
      setAnnouncementsLoading(false);
    });
  }, []);

  const availableExams = exams.filter((e) => !e.submitted).length;
  const submittedExams = exams.filter((e) => e.submitted).length;
  const lastBooking = bookings[0];
  const lastBookingStatus = lastBooking ? BOOKING_STATUSES[lastBooking.status]?.label : 'لا يوجد حجز بعد';

  // الأقسام القابلة للترتيب والإخفاء (الترتيب من تفضيلات الطالب)
  const SECTIONS = {
    announcements: () =>
      !announcementsLoading && announcements.length > 0 && (
        <Card className="border border-signal/30 bg-signal/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper">
              <Icon name="notifications" className="h-5 w-5 text-signal" />
              إعلانات مهمة
            </h2>
            <Link to="/student/notifications" className="text-sm text-signal hover:text-signal-light">
              كل الإعلانات ←
            </Link>
          </div>
          <ul className="divide-y divide-ink-700/60">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-paper">
                    {a.is_pinned && <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-signal" />}
                    {a.title}
                  </p>
                  {a.body && <p className="mt-0.5 text-sm text-muted">{a.body}</p>}
                  <p className="mt-1 text-xs text-muted/70">{formatDate(a.created_at)}</p>
                </div>
                {a.is_pinned && <Badge color="signal">مهم</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      ),

    stats: () => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="امتحانات متاحة" value={availableExams} icon="exams" color="signal" />
        <StatsCard label="تم تسليمها" value={submittedExams} icon="check" color="success" />
        <StatsCard label="إشعارات غير مقروءة" value={unreadCount} icon="notifications" color="warning" />
        <StatsCard label="آخر حجز" value={lastBookingStatus} icon="bookings" color="stream" />
      </div>
    ),

    exams: () => (
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
    ),

    bookings: () => (
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
            {lastBooking.grade === 'professional' ? (
              <p className="text-sm font-semibold text-paper">⭐ {lastBooking.notes || 'اشتراك في كورس احترافي'}</p>
            ) : (
              <p className="text-sm font-semibold text-paper">📅 حجز شهر: {formatMonth(lastBooking.month)}</p>
            )}
            <Badge color={BOOKING_STATUSES[lastBooking.status]?.color || 'muted'}>
              {lastBookingStatus}
            </Badge>
            {lastBooking.notes && <p className="text-sm text-muted">{lastBooking.notes}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="text-sm text-muted">لسه محجزش شهر — سجل اشتراكك من لوحة الحجوزات.</p>
            <Link to="/student/bookings" className="focus-ring rounded-lens border border-signal/50 px-4 py-2 text-sm font-bold text-signal">
              احجز شهر
            </Link>
          </div>
        )}
      </Card>
    )
  };

  // عرض الأقسام حسب ترتيب الطالب (المخفي مش موجود في الـ layout)
  const orderedSections = layout.filter((id) => SECTIONS[id]);

  return (
    <div className="space-y-6">
      {/* تنبيه الاشتراك — لو مش مفعّل (مش للاحترافي: بيشترك في كورسات فردية) */}
      {!accessLoading && !confirmed && !isProfessional && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lens border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-bold text-paper">اشتراكك غير مفعل بعد</p>
              <p className="text-xs text-muted">احجز شهرك وانتظر تأكيد المستر علشان الكورسات والامتحانات تفتح ليك.</p>
            </div>
          </div>
          <Link to="/student/bookings">
            <Button size="sm">احجز الآن</Button>
          </Link>
        </div>
      )}
      {!accessLoading && !confirmed && isProfessional && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lens border border-stream/40 bg-stream/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-sm font-bold text-paper">الكورس الاحترافي — اشترك في كورساتك</p>
              <p className="text-xs text-muted">اختر أي كورس احترافي من صفحة الكورسات، حوّل المبلغ وانتظر تأكيد المستر.</p>
            </div>
          </div>
          <Link to="/student/courses">
            <Button size="sm">تصفح الكورسات</Button>
          </Link>
        </div>
      )}

      {/* ترحيب */}
      <div className="card-panel flex flex-wrap items-center justify-between gap-4 rounded-lens p-6">
        <div>
          <p className="text-sm text-muted">أهلاً بيك من جديد 👋</p>
          <h1 className="font-display text-2xl font-black">{profile?.full_name}</h1>
          <p className="mt-1 text-sm text-muted">{GRADES[profile?.grade]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomizerOpen(true)}
            aria-label="تخصيص اللوحة"
            title="تخصيص اللوحة"
            className="focus-ring rounded-lens border border-ink-500 bg-ink-800 p-2.5 text-muted transition hover:border-signal/50 hover:text-signal"
          >
            <Icon name="settings" className="h-5 w-5" />
          </button>
          <Link
            to="/student/exams"
            className="focus-ring rounded-lens border border-signal/50 bg-signal/10 px-4 py-2.5 text-sm font-bold text-signal hover:bg-signal/20"
          >
            حل امتحان جديد
          </Link>
        </div>
      </div>

      {/* الأقسام بترتيب الطالب */}
      {orderedSections.map((id) => {
        const node = SECTIONS[id]();
        return node ? <div key={id}>{node}</div> : null;
      })}

      <DashboardCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  );
}