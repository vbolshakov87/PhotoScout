/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        foreground: '#eee',
        card: '#252542',
        primary: '#3498db',
        accent: '#f39c12',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
