import { cn } from '../../lib/utils.js';
import Badge from '../ui/Badge.jsx';

export default function MCQQuestion({ question, value, onChange, disabled }) {
  const options = Array.isArray(question.options) ? question.options : [];
  return (
    <fieldset>
      <legend className="sr-only">{question.question_text}</legend>
      <div className="space-y-2.5">
        {options.map((opt) => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const selected = value === optValue;
          return (
            <label
              key={optValue}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lens border px-4 py-3 text-sm font-medium transition',
                selected
                  ? 'border-signal/60 bg-signal/10 text-signal'
                  : 'border-ink-600 bg-ink-900/50 text-paper/85 hover:border-ink-500',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={optValue}
                checked={selected}
                onChange={() => onChange(question.id, optValue)}
                disabled={disabled}
                className="h-4 w-4 accent-signal"
              />
              <span className="flex-1">{optLabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}