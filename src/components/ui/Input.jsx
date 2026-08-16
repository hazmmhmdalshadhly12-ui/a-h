import { cn } from '../../lib/utils.js';

export default function Input({ label, error, hint, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper/90">
          {label}
          {props.required && <span className="text-signal"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'input-base',
          error && 'border-danger/60 focus:ring-danger',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}