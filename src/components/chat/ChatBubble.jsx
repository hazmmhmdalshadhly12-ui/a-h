import { cn } from '../../lib/utils.js';

/** فقاعة رسالة في الشات — بتتميز بين رسالة المستخدم ورسالة الطرف التاني */
export default function ChatBubble({ message, mine }) {
  return (
    <div className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lens px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          mine
            ? 'bg-signal text-ink'
            : 'border border-ink-600 bg-ink-800 text-paper'
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.body}</p>
        <p className={cn('mt-1 text-[10px]', mine ? 'text-ink/70' : 'text-muted')} dir="rtl">
          {new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          {message.is_read && !mine ? ' • مقروءة' : ''}
        </p>
      </div>
    </div>
  );
}
