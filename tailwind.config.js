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
      // Raios unificados: 8px em campos/botões, 12px em cards e modais.
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '8px',
        xl: '12px',
        '2xl': '12px',
      },
      boxShadow: {
        // Sombras discretas (visual clean): sem brilho, sem blur pesado.
        glass: '0 1px 2px rgba(2, 6, 23, 0.18), 0 1px 1px rgba(2, 6, 23, 0.1)',
        glow: '0 1px 2px rgba(2, 6, 23, 0.25)',
        pop: '0 12px 32px rgba(2, 6, 23, 0.35)',
      },
      backgroundImage: {
        // Cor sólida da marca (nome mantido por compatibilidade com as telas).
        'gradient-brand': 'linear-gradient(#1b8fd1, #1b8fd1)',
      },
    },
  },
  plugins: [],
};
