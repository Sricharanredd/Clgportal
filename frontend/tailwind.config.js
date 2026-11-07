/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Green + white theme tokens.
        forest: {
          DEFAULT: '#2F6B3C',
          dark: '#1E4229',
          light: '#4C8A58',
        },
        leaf: '#5B9A63',
        sage: '#4F8A5B',
        mint: '#C9E2CC',
        mist: '#F1F8F2',

        // Legacy token names retained so every existing component keeps
        // working while rendering the new green palette.
        peach: '#EDF6EE',
        lavender: '#D8EBD9',
        periwinkle: '#A9CDAF',
        violet: {
          DEFAULT: '#2F6B3C',
          400: '#4C8A58',
          600: '#245530',
        },
        rose: '#A8463F',
        porcelain: '#F7FBF8',
        plum: '#1E3A26',
        muted: '#5B6E60',
      },
      borderRadius: {
        glass: '1rem',
        pill: '9999px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(30,66,41,0.10)',
        soft: '0 2px 12px rgba(30,66,41,0.07)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '12px',
      },
      backgroundImage: {
        prism: 'linear-gradient(180deg, #FFFFFF 0%, #F4FAF5 30%, #D9ECDB 65%, #B4D5B9 100%)',
        'prism-soft': 'linear-gradient(180deg, #FFFFFF 0%, #F7FBF8 45%, #E3F1E5 100%)',
      },
    },
  },
  plugins: [],
};
