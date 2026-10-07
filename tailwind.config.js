/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta del sistema de diseño Stitch (ReviewScope / ReviewClassifier AI)
        surface: '#051424',
        'surface-dim': '#051424',
        'surface-bright': '#2c3a4c',
        'surface-container-lowest': '#010f1f',
        'surface-container-low': '#0d1c2d',
        'surface-container': '#122131',
        'surface-container-high': '#1c2b3c',
        'surface-container-highest': '#273647',
        'on-surface': '#d4e4fa',
        'on-surface-variant': '#d8c3ad',
        'inverse-surface': '#d4e4fa',
        'inverse-on-surface': '#233143',
        outline: '#a08e7a',
        'outline-variant': '#534434',
        primary: '#f59e0b',
        'primary-container': '#f59e0b',
        'on-primary': '#472a00',
        'on-primary-container': '#613b00',
        'primary-fixed-dim': '#ffb95f',
        'on-primary-fixed-variant': '#653e00',
        secondary: '#10b981',
        'secondary-container': '#059669',
        tertiary: '#ffbbbe',
        'tertiary-container': '#ff919a',
        error: '#f43f5e',
        'error-container': '#93000a',
        // Slates tradicionales
        slate: {
          850: '#151f32',
          950: '#070b14',
        },
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1.25rem',
        'space-xl': '2rem',
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['Newsreader', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        code: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
