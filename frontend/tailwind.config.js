/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        reading: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f0e8',
          300: '#e8dfd2',
          400: '#d4c4b0',
        },
        ink: {
          900: '#1c1917',
          800: '#292524',
          700: '#44403c',
          600: '#57534e',
          500: '#78716c',
          400: '#a8a29e',
        },
        accent: {
          DEFAULT: '#0d9488',
          hover: '#0f766e',
          light: '#ccfbf1',
          muted: '#99f6e4',
        },
        warm: {
          amber: '#d97706',
          gold: '#b45309',
        },
      },
      boxShadow: {
        'book': '0 4px 6px -1px rgba(28, 25, 23, 0.08), 0 2px 4px -2px rgba(28, 25, 23, 0.06)',
        'book-hover': '0 20px 25px -5px rgba(28, 25, 23, 0.08), 0 8px 10px -6px rgba(28, 25, 23, 0.06)',
        'page': '0 25px 50px -12px rgba(28, 25, 23, 0.15)',
      },
    },
  },
  plugins: [],
}
