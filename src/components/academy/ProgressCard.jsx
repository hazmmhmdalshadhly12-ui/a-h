import { cn } from '../../lib/utils.js';

/** شريط تقدم */
export default function ProgressCard({ label, value, max = 100, color = 'signal' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = {
    signal: 'bg-signal',
    stream: 'bg-stream',
    success: 'bg-success'
  }[color];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-display font-bold text-paper">
          {value}
          {max > 0 && <span className="text-muted"> / {max}</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-700">
        <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}