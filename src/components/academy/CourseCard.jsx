import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import { GRADE_SHORT } from '../../config/site.js';

export default function CourseCard({ course, locked = false }) {
  const { id, course_id, title, description, grade, image_url, order_index, section, section_title, accessible, price, lessons_count } = course || {};
  const courseId = id || course_id;
  const isLocked = locked || accessible === false;

  const priceLabel = price != null && Number(price) > 0 ? `${price} جنيه` : 'مجاني';

  return (
    <Card hover className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-800">
        {image_url ? (
          <img src={image_url} alt={title} className="h-full w-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-800 to-ink-700">
            <Icon name="courses" className="h-10 w-10 text-muted/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <Badge color={isLocked ? 'warning' : 'success'}>{isLocked ? 'مقفول' : 'متاح'}</Badge>
          {price != null && Number(price) > 0 && <Badge color="stream">{priceLabel}</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono">#{String(order_index || 1).padStart(2, '0')}</span>
          <span>{GRADE_SHORT[grade] || grade}</span>
          {(section || section_title) && <span className="ms-auto truncate">{section?.title || section_title}</span>}
        </div>

        <div>
          <h3 className="font-display text-base font-black leading-6 text-paper line-clamp-2">{title}</h3>
          {description && <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted">{description}</p>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-black text-signal">{priceLabel}</span>
          {isLocked ? (
            <Link to={`/student/checkout/${courseId}`}><Button size="sm"><Icon name="lock" className="h-3.5 w-3.5" /> ادفع الآن</Button></Link>
          ) : (
            <Link to={`/student/courses/${courseId}`} className="focus-ring inline-flex items-center gap-1 text-sm font-bold text-signal hover:text-signal-light">
              عرض الدروس <Icon name="chevronLeft" className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
