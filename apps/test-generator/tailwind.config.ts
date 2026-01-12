import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary accent (orange) - matching ProductSync
        accent: '#FA7315',
        'accent-hover': '#E5650F',

        // Surface colors
        surface: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
        },

        // Border colors
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
        },

        // Text colors
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',

        // Status colors
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
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
