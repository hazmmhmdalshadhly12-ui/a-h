import { cn } from '../../lib/utils.js';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-signal text-ink hover:bg-signal-light shadow-signal',
  secondary: 'border border-ink-500 bg-ink-700/60 text-paper hover:bg-ink-600',
  ghost: 'text-muted hover:text-paper hover:bg-ink-700/50',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  success: 'bg-success/15 text-success border border-success/30 hover:bg-success/25',
  outline: 'border border-signal/50 text-signal hover:bg-signal/10'
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-lens font-display font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4 border-current" />}
      {children}
    </button>
  );
}