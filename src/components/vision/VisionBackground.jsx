import { cn } from '../../lib/utils.js';
import VisionCore from './VisionCore.jsx';

/** خلفية ثابتة بتدّي إحساس "مشهد الرؤية" — شبكة + توهجات + عدسة كبيرة باهتة */
export default function VisionBackground({ className, showCore = true }) {
  return (
    <div className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)} aria-hidden="true">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/60 to-ink" />
      <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-signal/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-stream/10 blur-[140px]" />
      {showCore && (
        <div className="absolute -left-20 bottom-10 opacity-[0.06]">
          <VisionCore size={420} />
        </div>
      )}
    </div>
  );
}