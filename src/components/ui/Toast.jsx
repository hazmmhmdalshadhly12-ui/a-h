import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: 'border-success/40 bg-ink-800 text-success',
  error: 'border-danger/40 bg-ink-800 text-danger',
  info: 'border-stream/40 bg-ink-800 text-stream',
  warning: 'border-signal/40 bg-ink-800 text-signal'
};

function ToastItem({ toast }) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lens border px-4 py-3 shadow-panel animate-fade-up ${TOAST_STYLES[toast.type] || TOAST_STYLES.info}`}
    >
      <span className="text-lg leading-none">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const api = {
    toast: push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
    warning: (m) => push(m, 'warning')
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <button key={t.id} onClick={() => dismiss(t.id)} className="w-full max-w-sm">
            <ToastItem toast={t} />
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}