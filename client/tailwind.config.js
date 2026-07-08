/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bolt: {
          50: '#F4F2FF',
          100: '#EAE6FF',
          200: '#CFC6FF',
          300: '#AC9DFF',
          400: '#8B79FF',
          500: '#6D5DFC',
          600: '#5644E0',
          700: '#4434B3',
          800: '#332686',
          900: '#221A59',
          950: '#14102E',
        },
        amber: {
          DEFAULT: '#FFB100',
          dark: '#E69A00',
        },
        mint: {
          DEFAULT: '#2EC4B6',
          dark: '#1F9E92',
        },
        ink: {
          950: '#0B0B17',
          900: '#101124',
          800: '#181934',
          700: '#22244A',
        },
        cream: '#F7F5FF',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 4px rgba(255, 177, 0, 0.15)',
        card: '0 4px 24px -8px rgba(34, 26, 89, 0.18)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
