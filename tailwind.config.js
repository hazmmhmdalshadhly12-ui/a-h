/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // هوية Vision Academy — ليل برمجي عميق + إشارة كهرمانية (البصيرة) + تيار تركوازي (البيانات)
        ink: {
          DEFAULT: '#0B1020',
          950: '#070B16',
          900: '#0B1020',
          800: '#111A33',
          700: '#172241',
          600: '#1F2D54',
          500: '#2A3A66'
        },
        paper: {
          DEFAULT: '#F6F3EA',
          dark: '#E8E2D2'
        },
        signal: {
          DEFAULT: '#F5B741',
          light: '#FFD27A',
          dark: '#D99422'
        },
        stream: {
          DEFAULT: '#5EEAD4',
          dark: '#2DD4BF'
        },
        muted: '#8B93B0',
        danger: '#F87171',
        success: '#34D399',
        warning: '#FBBF24'
      },
      fontFamily: {
        display: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        body: ['Tajawal', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        lens: '0.75rem'
      },
      boxShadow: {
        signal: '0 0 0 1px rgba(245,183,65,0.35), 0 10px 40px -12px rgba(245,183,65,0.25)',
        panel: '0 20px 60px -30px rgba(0,0,0,0.6)',
        glow: '0 0 24px -6px rgba(94,234,212,0.45)'
      },
      keyframes: {
        'lens-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        'lens-spin-rev': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' }
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        },
        'blink-caret': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        'dot-flash': {
          '0%,80%,100%': { opacity: '0.2' },
          '40%': { opacity: '1' }
        }
      },
      animation: {
        'lens-spin': 'lens-spin 40s linear infinite',
        'lens-spin-rev': 'lens-spin-rev 28s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'blink-caret': 'blink-caret 1.1s step-end infinite'
      }
    }
  },
  plugins: []
};
