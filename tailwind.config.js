/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mosman: {
          pink: '#D63B6E',
          teal: '#3DBFB8',
          dark: '#1a1a2e',
          card: '#16213e',
          border: '#0f3460',
        },
      },
    },
  },
  plugins: [],
}
