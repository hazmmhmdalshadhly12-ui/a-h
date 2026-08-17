import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

/** حقل إدخال رسالة شات مع زرار إرسال */
export default function ChatComposer({ onSend, disabled, placeholder = 'اكتب رسالتك...' }) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 border-t border-ink-600 p-3"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="input-base flex-1 py-2 text-sm"
        aria-label="رسالتك"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="إرسال"
        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lens bg-signal text-ink transition hover:bg-signal-light disabled:opacity-40"
      >
        <Icon name="send" className="h-4 w-4" />
      </button>
    </form>
  );
}
