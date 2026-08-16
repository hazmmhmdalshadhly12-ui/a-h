import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils.js';
import VisionCore from './VisionCore.jsx';
import { SITE } from '../../config/site.js';

export default function VisionLogo({ size = 40, showText = true, to = '/', className, textClassName }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)}>
      <VisionCore size={size} strokeWidth={Math.max(2, Math.round(size / 12))} />
      {showText && (
        <span className={cn('font-display font-black leading-tight', textClassName)}>
          <span className="block text-lg text-paper">Vision</span>
          <span className="block text-xs font-semibold tracking-wide text-signal">ACADEMY</span>
        </span>
      )}
    </Link>
  );
}

export { SITE };