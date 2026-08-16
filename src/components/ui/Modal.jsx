import { useEffect } from 'react';
import { cn } from '../../lib/utils.js';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl'
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-t-lens bg-ink-800 shadow-panel border border-ink-600 animate-fade-up sm:rounded-lens',
          sizeClass
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-ink-700 hover:text-paper"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-600 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}