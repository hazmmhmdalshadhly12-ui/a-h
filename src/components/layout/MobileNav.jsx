import Icon from '../ui/Icon.jsx';
import { cn } from '../../lib/utils.js';

/** شريط علوي للهاتف — بيفتح السايدبار */
export default function MobileNav({ onMenuClick, title }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-ink-600/70 bg-ink-900/90 px-4 backdrop-blur-md lg:hidden">
      <button
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-lens text-paper"
        onClick={onMenuClick}
        aria-label="فتح القائمة"
      >
        <Icon name="menu" />
      </button>
      <h1 className="font-display text-sm font-bold text-paper">{title}</h1>
      <div className="w-10" />
    </div>
  );
}