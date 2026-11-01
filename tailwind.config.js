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
        shell: {
          bg: '#0d0d0e',
          surface: '#161618',
          card: '#1e1e21',
          border: '#2c2c30',
          divider: '#242427',
          text: '#f4f4f6',
          muted: '#8e8e93',
          accent: '#52525b',
          success: '#a1a1aa',
          warning: '#a1a1aa',
          error: '#a1a1aa'
        }
      },
      fontFamily: {
        gurmukhi: ['"Noto Sans Gurmukhi"', 'sans-serif'],
        courier: ['"Courier Prime"', 'Courier', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
