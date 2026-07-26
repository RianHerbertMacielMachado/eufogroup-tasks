/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6ff',
          300: '#a5b8ff',
          400: '#818cf8',
          500: '#667eea',
          600: '#4f63d2',
          700: '#3d4fb8',
          800: '#2c3e50',
          900: '#1a2540',
        }
      }
    },
  },
  plugins: [],
}
