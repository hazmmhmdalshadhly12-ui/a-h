import { useState } from 'react';
import { cn } from '../../lib/utils.js';
import Icon from './Icon.jsx';

export default function Input({ label, error, hint, className, id, type, ...props }) {
  const inputId = id || props.name;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper/90">
          {label}
          {props.required && <span className="text-signal"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && !showPassword ? 'password' : 'text'}
          className={cn(
            'input-base pr-12',
            error && 'border-danger/60 focus:ring-danger',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-paper focus:outline-none"
            aria-label={showPassword ? 'إخفاء الباسوورد' : 'إظهار الباسوورد'}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}