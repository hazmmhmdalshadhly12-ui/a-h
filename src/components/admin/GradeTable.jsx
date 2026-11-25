import { useState } from 'react';
import DataTable from './DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADES } from '../../config/site.js';
import { getSubmissionGradingInfo } from '../../utils/examHelpers.js';

/**
 * جدول درجات امتحان:
 * - الموضوعي بيتصحح تلقائياً (auto_score من السيرفر لحظة التسليم)
 * - الدرجة النهائية بتتكتب من مجموع نقاط الامتحان (مثلاً «من 20») —
 *   المستر يقدر يدي الطالب أي درجة من 0 للدرجة الكاملة، ويعدلها في
 *   أي وقت (قبل أو بعد النشر) والتعديل يظهر للطالب ولوحة التفوق فورًا
 * - الامتحان اللي فيه أسئلة مقالية لا يتنشر تسليمه غير بعد تصحيحه
 *   (الفرض من الخادم داخل publish_grade / publish_exam_grades)
 */
export default function GradeTable({ submissions, questions = [], onOpenReview, onGrade, onPublishOne }) {
  const [drafts, setDrafts] = useState({});

  const columns = [
    {
      key: 'student',
      label: 'الطالب',
      render: (s) => (
        <div>
          <p className="font-semibold text-paper">{s.profiles?.full_name || '—'}</p>
          <p className="text-xs text-muted">{GRADES[s.profiles?.grade] || ''}</p>
        </div>
      )
    },
    {
      key: 'auto',
      label: 'موضوعي (آلي)',
      render: (s) => <span className="font-mono text-stream">{s.auto_score ?? '—'}</span>
    },
    {
      key: 'final',
      label: 'الدرجة النهائية',
      render: (s) => {
        const { totalPoints, essayPending, currentScore } = getSubmissionGradingInfo(s, questions);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={totalPoints}
                step="0.5"
                className="input-base w-24 px-2 py-1 text-sm"
                defaultValue={drafts[s.id] ?? (essayPending ? '' : currentScore)}
                placeholder="من إجمالي"
                onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                onBlur={(e) => {
                  const v = String(e.target.value).trim();
                  if (v === '' || Number.isNaN(Number(v))) return; // فراغ = لسه مش مصحح (لا يحفظ صفرًا بالغلط)
                  onGrade?.(s.id, Number(v));
                }}
              />
              <span className="text-xs text-muted">من {totalPoints}</span>
            </div>
            {essayPending && (
              <p className="text-[11px] leading-relaxed text-warning">بانتظار تصحيح المقالي</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'النشر',
      render: (s) => {
        const { essayPending } = getSubmissionGradingInfo(s, questions);
        if (s.grade_released) return <Badge color="success">منشور للطالب</Badge>;
        if (essayPending) return <Badge color="warning">بانتظار التصحيح</Badge>;
        return <Badge color="stream">جاهز للنشر</Badge>;
      }
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (s) => {
        const { essayPending } = getSubmissionGradingInfo(s, questions);
        return (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => onOpenReview?.(s)}>
              <Icon name="eye" className="h-3.5 w-3.5" /> مراجعة
            </Button>
            <Button
              size="sm"
              variant="success"
              disabled={essayPending || s.grade_released}
              title={essayPending ? 'صحّح الدرجة النهائية أولاً' : undefined}
              onClick={() => onPublishOne?.(s.id)}
            >
              نشر
            </Button>
          </div>
        );
      }
    }
  ];

  return <DataTable columns={columns} rows={submissions} emptyMessage="لا توجد تسليمات لهذا الامتحان بعد" />;
}
