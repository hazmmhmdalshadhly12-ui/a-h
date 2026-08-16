import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';

/** بطاقة إحصائية للوحات */
export default function StatsCard({ label, value, icon, color = 'signal', hint }) {
  const colorMap = {
    signal: 'text-signal bg-signal/15',
    stream: 'text-stream bg-stream/15',
    success: 'text-success bg-success/15',
    warning: 'text-warning bg-warning/15',
    danger: 'text-danger bg-danger/15'
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lens ${colorMap[color]}`}>
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-black text-paper">{value ?? '—'}</p>
        <p className="text-sm text-muted">{label}</p>
        {hint && <p className="truncate text-xs text-muted/70">{hint}</p>}
      </div>
    </Card>
  );
}