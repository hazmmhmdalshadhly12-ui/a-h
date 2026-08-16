import Icon from '../ui/Icon.jsx';
import { cn } from '../../lib/utils.js';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lens px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-signal text-ink'
            : 'border border-ink-600 bg-ink-900/70 text-paper'
        )}
      >
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-stream">
            <Icon name="eye" className="h-3.5 w-3.5" /> Vision AI
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}