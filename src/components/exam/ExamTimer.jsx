import { useEffect, useState } from 'react';
import { formatCountdown } from '../../utils/formatTime.js';

/** تايمر اختياري — بيكمل عد من المدة اللي اتبعتت، وبينادي onExpire لما يخلص */
export default function ExamTimer({ seconds, onExpire, running = true }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      onExpire?.();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running, onExpire]);

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