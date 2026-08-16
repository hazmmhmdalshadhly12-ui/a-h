import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADE_SHORT } from '../../config/site.js';
import { formatDateTime, daysUntil } from '../../utils/formatDate.js';

export default function CompetitionCard({ competition }) {
  const days = daysUntil(competition.deadline);
  return (
    <Card hover className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-warning/15 text-warning">
          <Icon name="competitions" className="h-5 w-5" />
        </div>
        <Badge color="muted">{GRADE_SHORT[competition.grade] || competition.grade}</Badge>
      </div>

      <h3 className="font-display text-lg font-bold text-paper">{competition.title}</h3>
      <p className="text-sm leading-relaxed text-muted line-clamp-3">{competition.description}</p>

      <div className="mt-auto space-y-1.5 text-xs text-muted">
        <p className="flex items-center gap-2">
          <Icon name="clock" className="h-4 w-4" /> الموعد النهائي: {formatDateTime(competition.deadline)}
        </p>
        {days !== null && days >= 0 && (
          <p className="flex items-center gap-2 text-signal">
            <Icon name="calendar" className="h-4 w-4" /> متبقي {days} يوم
          </p>
        )}
      </div>
    </Card>
  );
}