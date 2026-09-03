/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca Startip — azul #1E9BE0 (do logo).
        brand: {
          50: '#eef8fd',
          100: '#d5eefb',
          200: '#aeddf6',
          300: '#78c8f1',
          400: '#40b0e9',
          500: '#1e9be0',
          600: '#1580bf',
          700: '#14669b',
          800: '#165780',
          900: '#17496a',
        },
      },
      fontFamily: {
        // Corpo em Montserrat; títulos em Poppins (font-display).
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Montserrat', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(2, 6, 23, 0.45)',
        glow: '0 0 24px rgba(30, 155, 224, 0.4)',
      },
      backgroundImage: {
        // Degradê azul da marca.
        'gradient-brand': 'linear-gradient(135deg, #1580bf 0%, #1e9be0 55%, #40b0e9 100%)',
      },
    },
  },
  plugins: [],
};
