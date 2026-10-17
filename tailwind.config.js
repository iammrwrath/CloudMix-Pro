/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dj: {
          bg: 'var(--bg-primary)',
          panel: 'var(--surface)',
          surface: 'var(--surface-elevated)',
          border: 'var(--border-subtle)',
        },
        deck: {
          a: '#00f2fe',
          b: '#ff007f',
        },
        accent: {
          cyan: '#00f2fe',
          magenta: '#ff007f',
          amber: '#ffb703',
          green: '#00ff66',
        },
      },
      fontSize: {
        '2xs': ['0.8125rem', { lineHeight: '1.25' }], // 13px
        xs: ['0.875rem', { lineHeight: '1.35' }],    // 14px
        sm: ['0.9375rem', { lineHeight: '1.4' }],    // 15px
        base: ['1rem', { lineHeight: '1.5' }],       // 16px
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
