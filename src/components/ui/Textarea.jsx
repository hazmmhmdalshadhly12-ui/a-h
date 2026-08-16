import { cn } from '../../lib/utils.js';

export default function Textarea({ label, error, className, id, rows = 4, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper/90">
          {label}
          {props.required && <span className="text-signal"> *</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn('input-base resize-y', error && 'border-danger/60', className)}
        {...props}
      />
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}