/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Ini penting untuk fitur Dark Mode
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        dark: '#0f172a',
        darker: '#020617',
      }
    },
  },
  plugins: [],
}