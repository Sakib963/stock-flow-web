/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tenor: ['"Tenor Sans"', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        bangla: ['"Noto Sans Bengali"', 'sans-serif'],
        siliguri: ['"Hind Siliguri"', 'sans-serif'],
        mulish: ['"Mulish"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#594ED1',
          light: '#7E75E5',  
          dark: '#4639A8',   
        },
        secondary: {
          DEFAULT: '#180B26',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
