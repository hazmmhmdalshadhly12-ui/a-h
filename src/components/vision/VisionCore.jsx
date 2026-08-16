import { cn } from '../../lib/utils.js';

/**
 * Vision Core — العنصر المميز للأكاديمية (Signature Element).
 * عدسة/بؤرة رؤية بأذرع تكوين تدور ببطء، مع أقواس أكواد في الأركان.
 * بيتكرر في الشعار، اللودر، الرئيسية، وفواصل الأقسام.
 */
export default function VisionCore({ size = 160, animated = true, className, strokeWidth = 4 }) {
  return (
    <div
      className={cn('relative shrink-0 select-none', animated && 'animate-lens-spin', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <linearGradient id="core-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F5B741" />
            <stop offset="1" stopColor="#5EEAD4" />
          </linearGradient>
        </defs>

        {/* الحلقة الخارجية */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="#1F2D54" strokeWidth={strokeWidth} />
        <circle cx="100" cy="100" r="78" fill="none" stroke="#172241" strokeWidth={strokeWidth * 0.7} />

        {/* حلقات دوّارة عكس الاتجاه */}
        <g className={animated ? 'animate-lens-spin-rev' : ''} style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="url(#core-grad)"
            strokeWidth={strokeWidth * 0.8}
            strokeDasharray="2 10"
          />
        </g>

        {/* أذرع العدسة (البؤرة) */}
        <g stroke="url(#core-grad)" strokeWidth={strokeWidth * 0.7} strokeLinecap="round">
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 60 * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 92;
            const y1 = 100 + Math.sin(angle) * 92;
            const x2 = 100 + Math.cos(angle) * 64;
            const y2 = 100 + Math.sin(angle) * 64;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={0.9} />;
          })}
        </g>

        {/* العين الداخلية */}
        <circle cx="100" cy="100" r="26" fill="#0B1020" stroke="url(#core-grad)" strokeWidth={strokeWidth} />
        <circle cx="100" cy="100" r="10" fill="url(#core-grad)" />

        {/* أقواس أكواد */}
        <g fill="#8B93B0" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
          <text x="14" y="30" fontSize="22">&lt;</text>
          <text x="162" y="30" fontSize="22">/&gt;</text>
          <text x="14" y="186" fontSize="22">{"{"}</text>
          <text x="162" y="186" fontSize="22">{"}"}</text>
        </g>
      </svg>
    </div>
  );
}