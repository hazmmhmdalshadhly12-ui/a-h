import { cn } from '../../lib/utils.js';

/** شريط تقدم الامتحان */
export default function ExamProgress({ answeredCount, total, currentIndex }) {
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>تمت الإجابة على {answeredCount} من {total}</span>
        <span className="font-mono">{currentIndex + 1} / {total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-stream transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}