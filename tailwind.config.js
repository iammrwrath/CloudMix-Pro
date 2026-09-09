/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dj: {
          bg: '#0a0d14',
          panel: '#111622',
          surface: '#181f2f',
          surfaceHover: '#222b40',
          border: '#2a3449',
          accent: '#00f0ff',
          neonBlue: '#00b4d8',
          neonGreen: '#10b981',
          neonOrange: '#f97316',
          neonRed: '#ef4444',
          neonPurple: '#a855f7',
          deckA: '#00e5ff',
          deckB: '#ff3366',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
