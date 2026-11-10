/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF6EE',
        ink: '#1B1A17',
        tangerine: { DEFAULT: '#E8590C', dark: '#C2410C', soft: '#FFE8D6' },
        moss: '#2F6F4F',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { hard: '4px 4px 0 0 #1B1A17', 'hard-sm': '2px 2px 0 0 #1B1A17' },
    },
  },
  plugins: [],
};
