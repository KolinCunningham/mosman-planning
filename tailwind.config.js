/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mosman: {
          pink: '#D63B6E',
          teal: '#2a9d8f',
          dark: '#f8fafc',
          card: '#ffffff',
          border: '#f1f5f9',
          line: '#e2e8f0',
        },
      },
    },
  },
  plugins: [],
}
