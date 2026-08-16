import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import { formatDuration } from '../../utils/formatTime.js';

export default function ExamHeader({ exam, onSubmit }) {
  return (
    <div className="card-panel flex flex-col gap-4 rounded-lens p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lens bg-signal/15 text-signal">
            <Icon name="exams" className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-paper">{exam.title}</h1>
            <p className="text-sm text-muted">{exam.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="signal">
            <Icon name="clock" className="h-3.5 w-3.5" /> {formatDuration(exam.duration_minutes)}
          </Badge>
          <Badge color="danger">قفل نهائي بعد التسليم</Badge>
        </div>
      </div>
    </div>
  );
}