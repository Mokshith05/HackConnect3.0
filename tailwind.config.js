/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#6366F1',
          purple: '#4F46E5',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          zinc: '#3F3F46',
        }
      }
    },
  },
  plugins: [],
}
