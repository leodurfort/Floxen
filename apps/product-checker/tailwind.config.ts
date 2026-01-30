import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        landing: {
          primary: '#C05A30',
          'primary-hover': '#A84E28',
          'primary-light': '#FDF4F1',
        },
        accent: '#FA7315',
        'accent-hover': '#E5650F',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
