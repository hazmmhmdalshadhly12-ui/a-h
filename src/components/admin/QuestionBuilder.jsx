import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { QUESTION_TYPES } from '../../config/constants.js';
import { cn } from '../../lib/utils.js';

/**
 * فورم سؤال واحد — للموضوعي بيحفظ الإجابة الصحيحة،
 * للمقالي بيسيبها فاضية (تصحيح يدوي).
 */
export default function QuestionBuilder({ question, onChange, onRemove, index }) {
  const [expanded, setExpanded] = useState(true);
  const q = question || {
    question_text: '',
    type: 'mcq',
    options: ['', ''],
    correct_answer: '',
    points: 1
  };

  const isMcq = q.type === 'mcq';
  const isTrueFalse = q.type === 'true_false';
  const isShort = q.type === 'short_answer';

  const patch = (fields) => onChange?.({ ...q, ...fields });

  const handleType = (type) => {
    const next = { ...q, type, correct_answer: '' };
    if (type === 'mcq') next.options = Array.isArray(q.options) && q.options.length ? q.options : ['', ''];
    if (type === 'true_false') next.options = ['true', 'false'];
    if (type === 'short_answer') next.options = [];
    onChange?.(next);
  };

  const patchOption = (i, val) => {
    const options = [...(q.options || [])];
    options[i] = val;
    patch({ options });
  };

  return (
    <div className="rounded-lens border border-ink-600 bg-ink-900/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <Input
            name={`question-${index}`}
            label={`السؤال ${index + 1}`}
            placeholder="نص السؤال..."
            value={q.question_text}
            onChange={(e) => patch({ question_text: e.target.value })}
          />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="focus-ring mt-6 flex h-8 w-8 items-center justify-center rounded-lens text-muted hover:text-paper"
          aria-label={expanded ? 'طي السؤال' : 'فتح السؤال'}
        >
          <Icon name="chevronDown" className={cn('h-4 w-4 transition', expanded && 'rotate-180')} />
        </button>
        <button
          onClick={onRemove}
          className="focus-ring mt-6 flex h-8 w-8 items-center justify-center rounded-lens text-danger hover:bg-danger/10"
          aria-label="حذف السؤال"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              name={`question-type-${index}`}
              label="نوع السؤال"
              value={q.type}
              onChange={(e) => handleType(e.target.value)}
              options={Object.values(QUESTION_TYPES)}
            />
            <Input
              name={`question-points-${index}`}
              label="الدرجة"
              type="number"
              min="0"
              value={q.points}
              onChange={(e) => patch({ points: Number(e.target.value) || 0 })}
            />
          </div>

          {isMcq && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-paper/90">الاختيارات</p>
              {(q.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    name={`opt-${index}-${i}`}
                    placeholder={`اختيار ${i + 1}`}
                    value={opt}
                    onChange={(e) => patchOption(i, e.target.value)}
                  />
                  <button
                    onClick={() => patch({ options: q.options.filter((_, j) => j !== i) })}
                    disabled={(q.options || []).length <= 2}
                    className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lens text-danger hover:bg-danger/10 disabled:opacity-30"
                    aria-label="حذف اختيار"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => patch({ options: [...(q.options || []), ''] })}
              >
                <Icon name="plus" className="h-4 w-4" /> إضافة اختيار
              </Button>
            </div>
          )}

          {isTrueFalse && (
            <p className="rounded-lens bg-ink-800 px-3 py-2 text-xs text-muted">
              الإجابة الصحيحة: اختار من صح / غلط في خانة الإجابة بالأسفل.
            </p>
          )}

          {isShort && (
            <p className="rounded-lens bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
              سؤال مقالي — هيتم تصحيحه يدوياً من لوحة الأدمن، والإجابة الصحيحة مش مطلوبة هنا.
            </p>
          )}

          {!isShort && (
            <Select
              name={`correct-${index}`}
              label="الإجابة الصحيحة"
              value={q.correct_answer}
              onChange={(e) => patch({ correct_answer: e.target.value })}
              options={
                isTrueFalse
                  ? [
                      { value: 'true', label: 'صح' },
                      { value: 'false', label: 'غلط' }
                    ]
                  : (q.options || []).filter(Boolean).map((opt, i) => ({ value: opt, label: `${i + 1}) ${opt}` }))
              }
              placeholder="اختر الإجابة الصحيحة"
            />
          )}
        </div>
      )}
    </div>
  );
}