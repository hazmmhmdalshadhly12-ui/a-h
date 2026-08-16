import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADE_SHORT } from '../../config/site.js';

export default function CourseCard({ course }) {
  return (
    <Card hover className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-stream/15 text-stream">
          <Icon name="courses" className="h-5 w-5" />
        </div>
        <Badge color="muted">{GRADE_SHORT[course.grade] || course.grade}</Badge>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-paper">{course.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-3">{course.description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-mono text-xs text-muted">#{String(course.order_index || 1).padStart(2, '0')}</span>
        <Link
          to={`/student/courses/${course.id}`}
          className="focus-ring inline-flex items-center gap-1.5 text-sm font-bold text-signal hover:text-signal-light"
        >
          عرض الدرس
          <Icon name="chevronLeft" className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}