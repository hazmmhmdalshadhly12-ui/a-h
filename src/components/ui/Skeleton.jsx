import { cn } from '../../lib/utils.js';

export default function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-lens bg-ink-700/70', className)} aria-hidden="true" />
  );
}