import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADE_SHORT } from '../../config/site.js';

/** بطاقة كورس للصفحات العامة — من غير الفيديو (الفيديوهات بعد تسجيل الدخول فقط) */
export default function CoursePreview({ course }) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lens bg-ink-700 text-muted">
          <Icon name="courses" className="h-5 w-5" />
        </div>
        <Badge color="muted">{GRADE_SHORT[course.grade] || course.grade}</Badge>
      </div>

      <h3 className="font-display text-lg font-bold text-paper">{course.title}</h3>
      <p className="text-sm leading-relaxed text-muted line-clamp-3">{course.description}</p>

      {course.grade === 'professional' && course.price != null && (
        <p className="text-sm font-bold text-signal">💰 {course.price} جنيه</p>
      )}

      <div className="mt-auto flex items-center gap-2 rounded-lens border border-ink-600 bg-ink-900/60 px-3 py-2 text-xs text-muted">
        <Icon name="eye" className="h-4 w-4 text-signal" />
        {course.grade === 'professional' ? 'اشترك في الكورس من لوحة الطالب' : 'متاح للطلاب بعد تسجيل الدخول'}
      </div>
    </Card>
  );
}