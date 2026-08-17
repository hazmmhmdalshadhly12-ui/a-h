import { useId } from 'react';
import { cn } from '../../lib/utils.js';

/**
 * Vision V — الشعار ثلاثي الأبعاد الجديد.
 *
 * التصميم:
 *   - حرف V ضخم معدني بارز: الضلع الأيسر فضي مصقول، والضلع الأيمن ينتهي
 *     بسهم صاعد أزرق نيون (رمز للنمو).
 *   - دماغ تقني في المنتصف بين ضلعي الـ V: نصان (فضي + أزرق) بخطوط ودوائر
 *     Circuit Board.
 *   - إطار دائري أزرق نيون مضيء يلتف خلف حرف V (عمق بصري).
 *   - أجنحة/شرائح زرقاء معدنية أسفل القاعدة (Modern Crest).
 *
 * بيتحرك بنفس أسلوب VisionCore: دوران بطيء للحلقات + عكسي للحلقة الخارجية.
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
          {/* المعدن الفضي المصقول */}
          <linearGradient id={`steel-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F4F5F8" />
            <stop offset="0.35" stopColor="#C7CBD4" />
            <stop offset="0.6" stopColor="#8E94A3" />
            <stop offset="1" stopColor="#565C6E" />
          </linearGradient>
          <linearGradient id={`steel-edge-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6B7280" />
            <stop offset="1" stopColor="#2A2F3A" />
          </linearGradient>
          {/* الأزرق النيون المضيء */}
          <linearGradient id={`neon-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7DF9FF" />
            <stop offset="0.5" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          {/* الأزرق المعدني الداكن (الأجنحة) */}
          <linearGradient id={`blade-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          {/* بريق الدماغ */}
          <linearGradient id={`brain-silver-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DDE1E9" />
            <stop offset="1" stopColor="#7C8294" />
          </linearGradient>
          <linearGradient id={`brain-blue-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>

          {/* توهج أزرق نيون */}
          <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`glow-soft-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== الإطار الدائري المضيء ===== */}
        <g className={animated ? 'animate-lens-spin-rev' : ''} style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke={`url(#neon-${uid})`}
            strokeWidth="1.4"
            strokeDasharray="4 12"
            opacity="0.65"
            filter={`url(#glow-soft-${uid})`}
          />
        </g>

        {/* ===== الأجنحة/الشرائح السفلية (Crest) ===== */}
        <g stroke={`url(#blade-${uid})`} strokeWidth="3.2" strokeLinecap="round">
          <path d="M78 150 L52 174" opacity="0.85" />
          <path d="M122 150 L148 174" opacity="0.85" />
          <path d="M88 156 L72 178" opacity="0.6" />
          <path d="M112 156 L128 178" opacity="0.6" />
          <path d="M96 160 L92 182" opacity="0.5" />
          <path d="M104 160 L108 182" opacity="0.5" />
        </g>
        <g fill="none" stroke={`url(#blade-${uid})`} strokeWidth="1.2" opacity="0.55">
          <circle cx="100" cy="168" r="10" strokeDasharray="2 4" />
          <circle cx="100" cy="168" r="17" strokeDasharray="2 6" />
        </g>

        {/* ===== حرف V المعدني =====
             الضلع الأيسر: فضي مصقول + حافة جانبية لإحساس العمق.
             الضلع الأيمن: فضي، مع سهم صاعد أزرق نيون في طرفه العلوي. */}
        <g>
          {/* الظل الخلفي (عمق) */}
          <path
            d="M55 40 L100 150 L145 40"
            fill="none"
            stroke="#05070D"
            strokeWidth="27"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
          {/* الضلع الأيسر — المعدن الفضي */}
          <path
            d="M55 40 L100 150"
            fill="none"
            stroke={`url(#steel-${uid})`}
            strokeWidth="22"
            strokeLinecap="round"
            opacity="0.96"
          />
          {/* الضلع الأيمن — المعدن الفضي */}
          <path
            d="M145 40 L100 150"
            fill="none"
            stroke={`url(#steel-${uid})`}
            strokeWidth="22"
            strokeLinecap="round"
            opacity="0.96"
          />
          {/* لمسة بريق وسطية (Highlight) على الضلع الأيسر */}
          <path
            d="M62 48 L99 142"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* الحافة الجانبية للضلع الأيمن (إحساس المعدن البارز) */}
          <path
            d="M151 42 L103 150"
            fill="none"
            stroke={`url(#steel-edge-${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>

        {/* ===== السهم الصاعد الأزرق (طرف الضلع الأيمن) ===== */}
        <g filter={`url(#glow-${uid})`}>
          <path
            d="M141 22 L165 22 L172 6 L179 22 L203 22 L184 36 L188 52 L165 40 L142 52 L146 36 Z"
            fill={`url(#neon-${uid})`}
            opacity="0.95"
          />
        </g>
        <path
          d="M146 34 L164 30 L171 20 L178 30 L196 34 L178 42 L175 46 L165 40 L155 46 L152 42 Z"
          fill="#E6FDFF"
          opacity="0.7"
        />

        {/* ===== الدماغ التقني (بالمنتصف بين ضلعي الـ V) ===== */}
        <g>
          {/* النصف الأيسر — فضي */}
          <path
            d="M84 118
               C76 100 84 84 94 76
               C98 72 100 66 100 66
               C102 74 104 78 107 82
               C113 90 114 102 110 114
               C108 118 106 120 104 121
               C97 124 90 124 84 118 Z"
            fill={`url(#brain-silver-${uid})`}
            stroke="#2A2F3A"
            strokeWidth="1.4"
          />
          {/* النصف الأيمن — أزرق */}
          <path
            d="M116 118
               C124 100 116 84 106 76
               C102 72 100 66 100 66
               C98 74 96 78 93 82
               C87 90 86 102 90 114
               C92 118 94 120 96 121
               C103 124 110 124 116 118 Z"
            fill={`url(#brain-blue-${uid})`}
            stroke="#1D4ED8"
            strokeWidth="1.4"
          />
          {/* خطوط ودوائر Circuit Board */}
          <g stroke="#0A0F1E" strokeWidth="1.1" fill="none" opacity="0.8">
            <path d="M84 92 L92 92 L95 86" />
            <path d="M116 92 L108 92 L105 86" />
            <path d="M92 108 L100 104 L108 108" />
            <circle cx="95" cy="86" r="1.6" fill="#0A0F1E" />
            <circle cx="105" cy="86" r="1.6" fill="#0A0F1E" />
            <circle cx="100" cy="104" r="1.8" fill="#0A0F1E" />
          </g>
          {/* شريط فصل مركزي */}
          <line x1="100" y1="66" x2="100" y2="122" stroke="#0A0F1E" strokeWidth="1.2" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}