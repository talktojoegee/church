import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef1fb',
          100: '#d9e0f5',
          200: '#b3c1eb',
          300: '#8da2e0',
          400: '#4d6bc9',
          500: '#243b8a',
          600: '#1e2f6e',
          700: '#152a7a',
          800: '#0f1f5c',
          900: '#0a1552',
        },
        flame: {
          DEFAULT: '#c62828',
          orange: '#e65100',
        },
        gold: {
          DEFAULT: '#ffb300',
          light: '#ffc947',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
