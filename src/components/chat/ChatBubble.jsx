import { useState } from 'react';
import { cn } from '../../lib/utils.js';

/** فقاعة رسالة في الشات — بتتميز بين رسالة المستخدم ورسالة الطرف التاني.
 *  "mine" = رسالة أنت كتبتها (الطالب) أو رسالة أي حد في شاشة الأدمن.
 */
export default function ChatBubble({ message, mine, deletable = false, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const handleDeleteClick = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    onDelete?.(message.id);
  };

  return (
    <div className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'group max-w-[80%] rounded-lens px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          mine
            ? 'bg-signal text-ink'
            : 'border border-ink-600 bg-ink-800 text-paper'
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.body}</p>
        <div className={cn('mt-1 flex items-center gap-2', mine ? 'justify-between' : 'justify-end')}>
          <p className="text-[10px]" dir="rtl">
            {new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            {message.is_read && !mine ? ' • مقروءة' : ''}
          </p>
          {deletable && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                confirming
                  ? 'bg-danger text-paper'
                  : 'opacity-0 hover:bg-black/10 focus:opacity-100 group-hover:opacity-100',
                mine ? 'text-ink/70' : 'text-muted'
              )}
            >
              {confirming ? 'تأكيد الحذف' : 'حذف'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
