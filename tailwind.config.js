/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true
  },
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'on-surface': '#131b2e',
        'outline': '#737686',
        'inverse-primary': '#b4c5ff',
        'surface-bright': '#faf8ff',
        'error-container': '#ffdad6',
        'on-primary-fixed-variant': '#003ea8',
        'on-tertiary-fixed': '#001e2f',
        'on-primary-fixed': '#00174b',
        'on-error-container': '#93000a',
        'tertiary-container': '#0074a6',
        'tertiary-fixed-dim': '#89ceff',
        'on-secondary': '#ffffff',
        'tertiary-fixed': '#c9e6ff',
        'on-secondary-container': '#54647a',
        'on-tertiary-fixed-variant': '#004c6e',
        'primary-fixed': '#dbe1ff',
        'on-tertiary-container': '#e4f2ff',
        'surface-container-low': '#f2f3ff',
        'on-primary-container': '#eeefff',
        'primary-container': '#2563eb',
        'secondary-fixed-dim': '#b7c8e1',
        'primary-fixed-dim': '#b4c5ff',
        'secondary': '#505f76',
        'on-error': '#ffffff',
        'surface-container': '#eaedff',
        'surface-container-lowest': '#ffffff',
        'inverse-surface': '#283044',
        'surface-tint': '#0053db',
        'secondary-fixed': '#d3e4fe',
        'on-background': '#131b2e',
        'on-surface-variant': '#434655',
        'inverse-on-surface': '#eef0ff',
        'primary': '#004ac6',
        'surface-dim': '#d2d9f4',
        'on-secondary-fixed': '#0b1c30',
        'outline-variant': '#c3c6d7',
        'surface-container-highest': '#dae2fd',
        'on-secondary-fixed-variant': '#38485d',
        'error': '#ba1a1a',
        'on-tertiary': '#ffffff',
        'surface-variant': '#dae2fd',
        'surface-container-high': '#e2e7ff',
        'surface': '#faf8ff',
        'secondary-container': '#d0e1fb',
        'background': '#faf8ff',
        'on-primary': '#ffffff',
        'tertiary': '#005a82'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        'space-sm': '0.5rem',
        'space-xl': '2rem',
        'space-lg': '1.25rem',
        'space-xs': '0.25rem',
        'margin': '2rem',
        'gutter': '1.5rem',
        'space-md': '0.75rem'
      },
      fontFamily: {
        'code-sm': ['JetBrains Mono', 'monospace'],
        'label-sm': ['Inter', 'sans-serif'],
        'headline-sm': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'display-lg': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-xs': ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}
