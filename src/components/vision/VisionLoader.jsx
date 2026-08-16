import VisionCore from './VisionCore.jsx';

export default function VisionLoader({ message = 'جارٍ فتح الرؤية...' }) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-ink">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-32 w-32 animate-ping rounded-full border border-signal/30" />
        <VisionCore size={120} />
      </div>
      <div className="flex items-center gap-1.5 text-muted">
        <span className="animate-dot-flash">●</span>
        <span className="animate-dot-flash" style={{ animationDelay: '0.2s' }}>●</span>
        <span className="animate-dot-flash" style={{ animationDelay: '0.4s' }}>●</span>
      </div>
      <p className="font-display text-sm font-semibold text-paper/80">{message}</p>
    </div>
  );
}