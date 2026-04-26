/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ffff00',
          100: '#ffff00',
          200: '#ffff00',
          400: '#ffff00',
          500: '#ffff00',
          600: '#ffff00',
          700: '#ffff00',
          900: '#000000',
        },
        dark: {
          900: '#000000',
          800: '#000000',
          700: '#000000',
          600: '#000000',
          500: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
