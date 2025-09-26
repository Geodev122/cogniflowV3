/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef6ff',
          100: '#daeefe',
          200: '#bddcfe',
          300: '#91c4fd',
          400: '#61a4fa',
          500: '#3b82f6',   // calmer primary
          600: '#2f6cd9',
          700: '#2757b3',
          800: '#214a93',
          900: '#1f3f7a',
        },
        accent: {
          500: '#6366f1',   // indigo accent (muted)
        },
        neutral: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem',
      },
      boxShadow: {
        soft: '0 6px 18px rgba(17, 24, 39, 0.06)',
      },
    },
  },
  plugins: [],
}
