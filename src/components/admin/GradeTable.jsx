import { useState } from 'react';
import DataTable from './DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { GRADES } from '../../config/site.js';

/**
 * جدول درجات امتحان:
 * - الموضوعي بيتصحح تلقائياً (auto_score من السيرفر لحظة التسليم)
 * - المقالي بيتكتب يدوياً (manual_score)
 * - "نشر الدرجات" بيفعل ظهور الدرجة للطالب من قاعدة البيانات نفسها
 */
export default function GradeTable({ submissions, onOpenReview, onManualScore, onPublishOne }) {
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
      key: 'manual',
      label: 'مقالي (يدوي)',
      render: (s) =>
        s.auto_score === null && s.manual_score === null && s.score === null && s.submitted ? (
          <span className="text-muted">—</span>
        ) : (
          <input
            type="number"
            min="0"
            className="input-base w-24 px-2 py-1 text-sm"
            defaultValue={drafts[s.id] ?? s.manual_score ?? ''}
            placeholder="يدوي"
            onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
            onBlur={(e) => onManualScore?.(s.id, Number(e.target.value) || 0)}
          />
        )
    },
    {
      key: 'total',
      label: 'الإجمالي',
      render: (s) => {
        const total = s.score;
        return <span className="font-display font-bold text-signal">{total ?? '—'}</span>;
      }
    },
    {
      key: 'status',
      label: 'النشر',
      render: (s) =>
        s.grade_released ? (
          <Badge color="success">منشور للطالب</Badge>
        ) : (
          <Badge color="warning">غير منشور</Badge>
        )
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => onOpenReview?.(s)}>
            <Icon name="eye" className="h-3.5 w-3.5" /> مراجعة
          </Button>
          <Button
            size="sm"
            variant="success"
            disabled={s.grade_released}
            onClick={() => onPublishOne?.(s.id)}
          >
            نشر
          </Button>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} rows={submissions} emptyMessage="لا توجد تسليمات لهذا الامتحان بعد" />;
}