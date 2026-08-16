import { cn } from '../../lib/utils.js';

export default function Select({ label, error, options = [], placeholder, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper/90">
          {label}
          {props.required && <span className="text-signal"> *</span>}
        </label>
      )}
      <select
        id={inputId}
        className={cn('input-base', error && 'border-danger/60', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const labelText = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value} className="bg-ink-800 text-paper">
              {labelText}
            </option>
          );
        })}
      </select>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}