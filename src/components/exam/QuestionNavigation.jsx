import { cn } from '../../lib/utils.js';

/** لوحة تنقل بين الأسئلة مع حالة كل سؤال */
export default function QuestionNavigation({ questions, answers, currentIndex, onSelect }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
      {questions.map((q, i) => {
        const answered = answers[q.id] !== null && answers[q.id] !== undefined && String(answers[q.id]) !== '';
        const active = i === currentIndex;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`سؤال ${i + 1}`}
            aria-current={active}
            className={cn(
              'focus-ring flex h-10 items-center justify-center rounded-lens border text-sm font-bold transition',
              active
                ? 'border-signal bg-signal text-ink'
                : answered
                  ? 'border-stream/50 bg-stream/15 text-stream'
                  : 'border-ink-600 bg-ink-900/50 text-muted hover:border-ink-500'
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}