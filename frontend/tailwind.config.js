/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: '#F9DCCB',
        lavender: '#DCCFF5',
        periwinkle: '#AAA0E8',
        violet: {
          DEFAULT: '#7960AD',
          400: '#9682C4',
          600: '#6A5299',
        },
        rose: '#C58DB8',
        porcelain: '#F9F7FC',
        plum: '#302744',
        muted: '#81788F',
        sage: '#5D9C7D',
      },
      borderRadius: {
        glass: '1rem',
        pill: '9999px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(48,39,68,0.08)',
        soft: '0 2px 12px rgba(48,39,68,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '12px',
      },
      backgroundImage: {
        prism: 'linear-gradient(135deg, #F9DCCB 0%, #DCCFF5 45%, #AAA0E8 100%)',
        'prism-soft': 'linear-gradient(160deg, #F9DCCB 0%, #F9F7FC 40%, #DCCFF5 100%)',
      },
    },
  },
  plugins: [],
};
