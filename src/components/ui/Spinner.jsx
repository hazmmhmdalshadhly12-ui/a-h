import { cn } from '../../lib/utils.js';

export default function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="جارٍ التحميل"
      className={cn(
        'inline-block h-6 w-6 animate-spin rounded-full border-2 border-stream/30 border-t-stream',
        className
      )}
    />
  );
}