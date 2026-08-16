import { cn } from '../../lib/utils.js';

export default function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'card-panel rounded-lens p-5',
        hover && 'transition hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-panel',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}