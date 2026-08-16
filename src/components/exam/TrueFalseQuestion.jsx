import { cn } from '../../lib/utils.js';

export default function TrueFalseQuestion({ question, value, onChange, disabled }) {
  const choices = [
    { value: 'true', label: 'صح ✓' },
    { value: 'false', label: 'غلط ✗' }
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {choices.map((c) => {
        const selected = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(question.id, c.value)}
            className={cn(
              'focus-ring flex-1 rounded-lens border px-4 py-3 text-sm font-bold transition sm:flex-none sm:min-w-36',
              selected
                ? c.value === 'true'
                  ? 'border-success/60 bg-success/15 text-success'
                  : 'border-danger/60 bg-danger/15 text-danger'
                : 'border-ink-600 bg-ink-900/50 text-paper/85 hover:border-ink-500',
              disabled && 'cursor-not-allowed opacity-70'
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}