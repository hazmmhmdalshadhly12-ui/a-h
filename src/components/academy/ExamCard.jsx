import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { formatDateTime, isFuture, isPast } from '../../utils/formatDate.js';
import { formatDuration } from '../../utils/formatTime.js';

/** كارت الامتحان للطالب — بيعرض حالة الخصوصية بوضوح:
 *  - عام: متاح لكل طلاب الصف بدون اشتراك.
 *  - خاص بالمشتركين: لو الطالب مش مشترك → كارت مقفول مع سبب المنع
 *    (الفعل الحقيقي بيفرضه الخادم في start_exam_attempt / get_exam_questions / submit_exam).
 */
export default function ExamCard({ exam, subscribed = true }) {
  const { submitted, id, title, description, duration_minutes, start_at, end_at, access_mode } = exam;
  const now = Date.now();
  const notStarted = start_at && isFuture(start_at);
  const deadlineClosed =
    duration_minutes && start_at && now > new Date(start_at).getTime() + duration_minutes * 60000;
  const closed = (end_at && isPast(end_at)) || deadlineClosed;

  const isPublic = access_mode === 'public';
  // مقفول: امتحان خاص + الطالب مش مشترك + لسه مسلمش
  const lockedBySubscription = !isPublic && !subscribed && !submitted;

  let statusColor = 'success';
  let statusLabel = 'متاح الآن';
  if (submitted) {
    statusColor = 'stream';
    statusLabel = 'تم التسليم';
  } else if (closed) {
    statusColor = 'muted';
    statusLabel = 'انتهى';
  } else if (notStarted) {
    statusColor = 'warning';
    statusLabel = 'لم يبدأ';
  }

  const canTake = !submitted && !closed && !notStarted && !lockedBySubscription;

  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-signal/15 text-signal">
          <Icon name="exams" className="h-5 w-5" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge color={statusColor}>{statusLabel}</Badge>
          <Badge color={isPublic ? 'stream' : 'signal'}>
            {isPublic ? 'امتحان عام' : 'خاص بالمشتركين'}
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted line-clamp-2">{description}</p>}
      </div>

      <div className="space-y-1.5 text-xs text-muted">
        <p className="flex items-center gap-2">
          <Icon name="clock" className="h-4 w-4" /> {formatDuration(duration_minutes)}
        </p>
        {start_at && (
          <p className="flex items-center gap-2">
            <Icon name="calendar" className="h-4 w-4" /> يبدأ: {formatDateTime(start_at)}
          </p>
        )}
        {end_at && (
          <p className="flex items-center gap-2">
            <Icon name="calendar" className="h-4 w-4" /> ينتهي: {formatDateTime(end_at)}
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 pt-2">
        {lockedBySubscription ? (
          <>
            <p className="rounded-lens border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
              هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً حتى تستطيع دخوله.
            </p>
            <Link to="/student/bookings">
              <Button variant="secondary" size="sm" className="w-full">
                تفعيل الاشتراك
              </Button>
            </Link>
          </>
        ) : canTake ? (
          <Link to={`/student/exams/${id}`}>
            <Button className="w-full" size="sm">
              <Icon name="play" className="h-4 w-4" /> حل الامتحان
            </Button>
          </Link>
        ) : submitted ? (
          <Link to={`/student/exams/${id}`}>
            <Button variant="secondary" size="sm" className="w-full">
              مراجعة تسليمك
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            غير متاح حالياً
          </Button>
        )}
      </div>
    </Card>
  );
}
