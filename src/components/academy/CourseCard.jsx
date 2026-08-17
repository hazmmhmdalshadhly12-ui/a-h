import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADE_SHORT } from '../../config/site.js';

export default function CourseCard({ course, locked = false }) {
  const { id, course_id, title, description, grade, image_url, order_index, section, section_title, accessible } = course || {};
  const courseId = id || course_id;
  const isLocked = locked || accessible === false;

  if (isLocked) {
    return (
      <Card className="flex h-full flex-col gap-3 opacity-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-ink-800 text-muted">
            <Icon name="lock" className="h-5 w-5" />
          </div>
          <Badge color="warning">مقفول</Badge>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-muted">{title}</h3>
          {description && <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-3">{description}</p>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-mono text-xs text-muted">#{String(order_index || 1).padStart(2, '0')}</span>
          <span className="text-xs font-semibold text-muted">متاح بعد تجديد اشتراكك</span>
        </div>
      </Card>
    );
  }

  return (
    <Card hover className="flex h-full flex-col gap-3">
      {image_url ? (
        <div className="relative -mx-1 overflow-hidden rounded-lens">
          <img src={image_url} alt={title} className="aspect-video w-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-stream/15 text-stream">
            <Icon name="courses" className="h-5 w-5" />
          </div>
          <Badge color="muted">{GRADE_SHORT[grade] || grade}</Badge>
        </div>
      )}

      <div>
        <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-3">{description}</p>}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-mono text-xs text-muted">#{String(order_index || 1).padStart(2, '0')}</span>
        <div className="flex items-center gap-2">
          {section && <Badge color="stream">{section.title}</Badge>}
          {section_title && <Badge color="stream">{section_title}</Badge>}
          <Link
            to={`/student/courses/${courseId}`}
            className="focus-ring inline-flex items-center gap-1.5 text-sm font-bold text-signal hover:text-signal-light"
          >
            عرض الدرس
            <Icon name="chevronLeft" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}