import { useEffect, useRef, useState } from 'react';
import { formatCountdown } from '../../utils/formatTime.js';

/** تايمر اختياري — بيكمل عد من المدة اللي اتبعتت، وبينادي onExpire لما يخلص.
 *  محمي ضد الاستدعاء الخاطئ: لو المدة 0 أو NaN أو سالب أثناء التحميل
 *  → منستدعيش onExpire لحظياً، والعدّاد مش هيبدأ أصلاً.
 */
export default function ExamTimer({ seconds, onExpire, running = true }) {
  // المدة الصالحة: لازم رقم موجب محدود — غير كده العدّاد يعتبر غير موجود
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const [left, setLeft] = useState(total);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // لما المدة تتغير (امتحان جديد) → نرجّع العداد ونعيد فتح إمكانية الاستدعاء
  useEffect(() => {
    expiredRef.current = false;
    setLeft(total);
  }, [total]);

  useEffect(() => {
    if (!running) return;
    // مدة غير صالحة أثناء التحميل → منستدعيش onExpire لحظياً
    if (total <= 0) return;
    if (left <= 0) {
      // وصلنا للصفر فعلياً بعد ما العداد اشتغل → استدعاء واحد بس
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running, total]);

  const urgent = left <= 60;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-lg font-bold ${
        urgent ? 'border-danger/50 bg-danger/15 text-danger' : 'border-stream/40 bg-stream/10 text-stream'
      }`}
      aria-live="polite"
      aria-label="الوقت المتبقي"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
      {formatCountdown(left)}
    </div>
  );
}