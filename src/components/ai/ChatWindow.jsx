import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage.jsx';
import ChatInput from './ChatInput.jsx';
import Icon from '../ui/Icon.jsx';

const SUGGESTIONS = ['إزاي أحجز حصة؟', 'امتى الامتحان الجاي؟', 'إيه أرقام التواصل؟', 'إيه الكورسات المتاحة؟'];

export default function ChatWindow({ messages, loading, onClose, onSend }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="fixed bottom-24 left-4 z-50 flex h-[480px] max-h-[calc(100vh_-_7rem)] w-[calc(100vw_-_2rem)] max-w-sm flex-col overflow-hidden rounded-lens border border-ink-600 bg-ink-900 shadow-panel animate-fade-up">
      <div className="flex items-center justify-between border-b border-ink-600 bg-ink-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-stream/15 text-stream">
            <Icon name="eye" className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-ink-800 bg-success" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-paper">Vision AI</p>
            <p className="text-xs text-muted">مساعد الأكاديمية الذكي</p>
          </div>
        </div>
        <button onClick={onClose} className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-ink-700 hover:text-paper" aria-label="إغلاق">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-lens border border-ink-600 bg-ink-900/70 px-3.5 py-2.5 text-sm leading-relaxed text-paper">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-stream">
            <Icon name="eye" className="h-3.5 w-3.5" /> Vision AI
          </div>
          أهلاً بيك، أنا مساعد Vision Academy. أسألني عن الحجز، الامتحانات، الكورسات، أو المسابقات.
        </div>

        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSend?.(s)}
                className="focus-ring rounded-full border border-stream/30 bg-stream/10 px-3 py-1 text-xs text-stream hover:bg-stream/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 px-1 text-xs text-muted">
            <span className="h-2 w-2 animate-dot-flash rounded-full bg-stream" />
            <span className="h-2 w-2 animate-dot-flash rounded-full bg-stream" style={{ animationDelay: '0.2s' }} />
            <span className="h-2 w-2 animate-dot-flash rounded-full bg-stream" style={{ animationDelay: '0.4s' }} />
            <span className="mr-1">بيجيب إجابة...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={onSend} disabled={loading} />
    </div>
  );
}