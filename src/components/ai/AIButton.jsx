import Icon from '../ui/Icon.jsx';
import { cn } from '../../lib/utils.js';

/** زر الشات العائم */
export default function AIButton({ onClick, open }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'إغلاق المساعد' : 'فتح المساعد'}
      className="focus-ring relative flex h-14 w-14 items-center justify-center rounded-full bg-signal text-ink shadow-signal transition hover:scale-105"
    >
      {open ? (
        <Icon name="close" className="h-6 w-6" />
      ) : (
        <Icon name="chat" className="h-6 w-6" />
      )}
      {!open && (
        <span className="absolute -top-1 -left-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-ink bg-stream" />
      )}
    </button>
  );
}