import { useId } from 'react';
import { cn } from '../../lib/utils.js';

/**
 * Vision V — الشعار ثلاثي الأبعاد (الرسم فقط).
 *
 * العناصر:
 *   - حرف V: الساق اليسرى فضي معدني عاكس تميل للأسفل، والساق اليمنى تتحول
 *     إلى سهم متجه للأعلى بأزرق كهربائي لامع (رمز الارتقاء).
 *   - دماغ إلكتروني: في الفراغ الداخلي العلوي — نقاط (دوائر) وخطوط متصلة
 *     مضاءة بأزرق (ذكاء اصطناعي / دوائر إلكترونية).
 *   - أجنحة/صفحات: خطوط وأشكال مثلثة مائلة للخارج من أسفل الـ V، بتدرج
 *     فضي→أزرق (ديناميكية).
 *   - قوس دائري غير مكتمل يتوهج بأزرق نيون يحيط بالشعار (حماية وشمول).
 *   - توهج (Glow) واضح عند الحواف لتعزيز الطابع ثلاثي الأبعاد.
 */
export default function VisionV({ size = 380, animated = true, className }) {
  const uid = useId().replace(/[:]/g, '');

  return (
    <div
      className={cn('relative shrink-0 select-none', animated && 'animate-lens-spin', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          {/* الفضي المعدني العاكس */}
          <linearGradient id={`steel-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F8F9FC" />
            <stop offset="0.3" stopColor="#D6DAE3" />
            <stop offset="0.6" stopColor="#9AA0B0" />
            <stop offset="1" stopColor="#5A6072" />
          </linearGradient>
          <linearGradient id={`steel-hi-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#8E94A3" />
          </linearGradient>
          {/* الأزرق الكهربائي اللامع */}
          <linearGradient id={`blue-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7DF9FF" />
            <stop offset="0.45" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          {/* تدرج الأجنحة فضي → أزرق */}
          <linearGradient id={`wing-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C7CBD4" />
            <stop offset="0.5" stopColor="#5EEAD4" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          {/* الأزرق المضيء للدماغ */}
          <linearGradient id={`brain-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A5F3FC" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>

          {/* توهج قوي */}
          <filter id={`glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`glow-soft-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== القوس الدائري غير المكتمل (يتوهج أزرق ويدور) ===== */}
        <g className={animated ? 'animate-lens-spin-rev' : ''} style={{ transformOrigin: '100px 100px' }}>
          <path
            d="M 100 12 A 88 88 0 1 1 48 168"
            fill="none"
            stroke={`url(#blue-${uid})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="3 9"
            opacity="0.85"
            filter={`url(#glow-soft-${uid})`}
          />
          <circle cx="100" cy="12" r="3.2" fill={`url(#blue-${uid})`} filter={`url(#glow-${uid})`} />
        </g>

        {/* ===== الأجنحة / الصفحات السفلية (مثلثات مائلة للخارج، فضي→أزرق) ===== */}
        <g filter={`url(#glow-soft-${uid})`}>
          {/* الجناح الأيسر */}
          <path
            d="M92 146 L52 168 L82 152 Z"
            fill={`url(#wing-${uid})`}
            opacity="0.75"
            stroke="#0A0F1E"
            strokeWidth="0.6"
          />
          <path
            d="M98 148 L78 176 L102 156 Z"
            fill={`url(#wing-${uid})`}
            opacity="0.45"
            stroke="#0A0F1E"
            strokeWidth="0.6"
          />
          {/* الجناح الأيمن */}
          <path
            d="M108 146 L148 168 L118 152 Z"
            fill={`url(#wing-${uid})`}
            opacity="0.75"
            stroke="#0A0F1E"
            strokeWidth="0.6"
          />
          <path
            d="M102 148 L122 176 L98 156 Z"
            fill={`url(#wing-${uid})`}
            opacity="0.45"
            stroke="#0A0F1E"
            strokeWidth="0.6"
          />
          {/* خطوط انسيابية سفلية */}
          <g stroke={`url(#blue-${uid})`} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
            <path d="M100 150 L100 178" />
            <path d="M88 154 L70 172" />
            <path d="M112 154 L130 172" />
          </g>
        </g>

        {/* ===== حرف V ===== */}
        <g>
          {/* ظل خلفي للعمق */}
          <path
            d="M56 36 L100 148 L144 36"
            fill="none"
            stroke="#05070D"
            strokeWidth="25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          {/* الساق اليسرى — فضي معدني يميل للأسفل */}
          <path
            d="M56 36 L100 148"
            fill="none"
            stroke={`url(#steel-${uid})`}
            strokeWidth="21"
            strokeLinecap="round"
          />
          <path
            d="M61 42 L98 141"
            fill="none"
            stroke={`url(#steel-hi-${uid})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M52 34 L96 150"
            fill="none"
            stroke="#3A3F4C"
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* الساق اليمنى — تتحول لسهم أزرق متجه للأعلى */}
          <path
            d="M144 36 L100 148"
            fill="none"
            stroke={`url(#blue-${uid})`}
            strokeWidth="21"
            strokeLinecap="round"
            filter={`url(#glow-${uid})`}
          />
          <path
            d="M139 40 L102 142"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* رأس السهم الصاعد فوق الساق اليمنى */}
          <g filter={`url(#glow-${uid})`}>
            <path
              d="M144 36 L172 8 L180 6 L160 26 L190 20 L184 34 L156 44 Z"
              fill={`url(#blue-${uid})`}
              opacity="0.95"
            />
          </g>
          {/* لمسة بريق بيضاء على رأس السهم */}
          <path
            d="M164 12 L170 10 L166 16 L172 14 L164 22 L160 18 Z"
            fill="#E6FDFF"
            opacity="0.8"
          />
        </g>

        {/* ===== الدماغ الإلكتروني (نقاط + خطوط متصلة، مضاء أزرق) ===== */}
        <g filter={`url(#glow-soft-${uid})`}>
          <g fill={`url(#brain-${uid})`}>
            {/* دوائر/نقاط الدماغ */}
            <circle cx="90" cy="78" r="4.5" />
            <circle cx="110" cy="78" r="4.5" />
            <circle cx="86" cy="94" r="3.6" />
            <circle cx="114" cy="94" r="3.6" />
            <circle cx="100" cy="88" r="5.4" />
            <circle cx="94" cy="106" r="3" />
            <circle cx="106" cy="106" r="3" />
            <circle cx="100" cy="102" r="3.4" />
          </g>
          {/* خطوط متصلة بين النقاط (دوائر إلكترونية) */}
          <g stroke={`url(#brain-${uid})`} strokeWidth="1.6" fill="none" opacity="0.9" strokeLinecap="round">
            <path d="M90 78 L100 88 L110 78" />
            <path d="M86 94 L94 88 L100 88" />
            <path d="M114 94 L106 88 L100 88" />
            <path d="M90 78 L86 94" />
            <path d="M110 78 L114 94" />
            <path d="M94 106 L100 102 L106 106" />
            <path d="M86 94 L94 106" />
            <path d="M114 94 L106 106" />
          </g>
          {/* نبضة مضيئة في المنتصف */}
          <circle cx="100" cy="88" r="2.2" fill="#FFFFFF" opacity="0.95" />
        </g>
      </svg>
    </div>
  );
}