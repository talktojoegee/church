import type { Config } from 'tailwindcss';

/** Power & Glory Generation — red, orange flame, black, white (from church logo) */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f5',
          100: '#ffe8e8',
          200: '#ffcccc',
          300: '#f0a0a0',
          400: '#e04d4d',
          500: '#D21010',
          600: '#C00000',
          700: '#990000',
          800: '#4a0a0a',
          900: '#0a0a0a',
        },
        flame: {
          DEFAULT: '#C00000',
          orange: '#F99D1C',
        },
        gold: {
          DEFAULT: '#F99D1C',
          light: '#FFB84D',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
