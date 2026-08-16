import VisionBackground from '../vision/VisionBackground.jsx';
import { cn } from '../../lib/utils.js';

export default function PageContainer({ children, className, withBackground = true }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {withBackground && <VisionBackground />}
      <div className={cn('relative z-10 flex flex-1 flex-col', className)}>{children}</div>
    </div>
  );
}