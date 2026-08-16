import { cn } from '../../lib/utils.js';

const COLORS = {
  signal: 'bg-signal/15 text-signal border-signal/30',
  stream: 'bg-stream/15 text-stream border-stream/30',
  success: 'bg-success/15 text-success border-success/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  muted: 'bg-ink-600 text-muted border-ink-500/50'
};

export default function Badge({ children, color = 'muted', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        COLORS[color] || COLORS.muted,
        className
      )}
    >
      {children}
    </span>
  );
}