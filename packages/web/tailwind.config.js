/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#111118',
        card: '#18181f',
        border: 'rgba(255, 255, 255, 0.08)',
        foreground: '#f8fafc',
        muted: '#71717a',
        primary: '#6366f1',
        'primary-light': '#818cf8',
        success: '#22c55e',
        danger: '#ef4444',
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        indigo: {
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px 4px rgba(99, 102, 241, 0.15)',
        'glow-lg': '0 0 30px 8px rgba(99, 102, 241, 0.2)',
        violet: '0 4px 14px 0 rgba(139, 92, 246, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-violet': 'linear-gradient(to bottom right, #8b5cf6, #6366f1)',
        'gradient-message': 'linear-gradient(to bottom right, #8b5cf6, #4f46e5)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
