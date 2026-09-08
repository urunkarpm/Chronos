/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#F3E5AB',
          500: '#D4AF37',
          600: '#AA820A',
          glow: 'rgba(212, 175, 55, 0.4)',
        },
        navy: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#111726',
          800: '#161F33',
          700: '#1F2B47',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        serif: ['Cinzel', 'serif'],
        mono: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': 'none',
        'gold-sm': 'none',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'float': 'float 6s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.9, transform: 'scale(1.08)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
