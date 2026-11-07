/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
<<<<<<< HEAD
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
=======
        /* ── Design tokens (values live in src/index.css → :root) ──────── */
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
        },
        accent: {
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--muted) / <alpha-value>)',
        },
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          bg: 'rgb(var(--success-bg) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          bg: 'rgb(var(--warning-bg) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          bg: 'rgb(var(--danger-bg) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          bg: 'rgb(var(--info-bg) / <alpha-value>)',
        },

        /* ── Legacy aliases ──────────────────────────────────────────────
           Existing screens (Fees, Results, Announcements, Parent portal)
           still use these names. They now resolve to the refined palette,
           so those screens pick up the new look without being rewritten. */
        plum: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        porcelain: 'rgb(var(--canvas) / <alpha-value>)',
        lavender: 'rgb(var(--brand-100) / <alpha-value>)',
        periwinkle: 'rgb(var(--line-strong) / <alpha-value>)',
        peach: 'rgb(var(--accent-100) / <alpha-value>)',
        rose: 'rgb(var(--danger) / <alpha-value>)',
        sage: 'rgb(var(--success) / <alpha-value>)',
        violet: {
          DEFAULT: 'rgb(var(--brand-500) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          600: 'rgb(var(--brand-700) / <alpha-value>)',
        },
>>>>>>> origin/main
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        card: 'var(--radius-xl)',
        panel: 'var(--radius-lg)',
        control: 'var(--radius-md)',
        chip: 'var(--radius-sm)',
        pill: 'var(--radius-full)',
        glass: 'var(--radius-xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-md)',
        lift: 'var(--shadow-lg)',
        soft: 'var(--shadow-sm)',
        glass: 'var(--shadow-md)',
        pop: '0 2px 6px rgb(var(--ink) / 0.06), 0 20px 40px -20px rgb(var(--ink) / 0.35)',
        'glow-brand':
          '0 0 0 1px rgb(var(--brand-400) / 0.6), 0 20px 44px -24px rgb(var(--brand-500) / 0.55)',
        'glow-accent':
          '0 0 0 1px rgb(var(--accent-500) / 0.55), 0 20px 44px -24px rgb(var(--accent-500) / 0.5)',
      },
      backdropBlur: {
        glass: '14px',
      },
      backgroundImage: {
<<<<<<< HEAD
        prism: 'linear-gradient(180deg, #FFFFFF 0%, #F4FAF5 30%, #D9ECDB 65%, #B4D5B9 100%)',
        'prism-soft': 'linear-gradient(180deg, #FFFFFF 0%, #F7FBF8 45%, #E3F1E5 100%)',
=======
        prism: 'linear-gradient(135deg, #F9DCCB 0%, #DCCFF5 45%, #AAA0E8 100%)',
        'prism-soft': 'linear-gradient(160deg, #F9DCCB 0%, #F9F7FC 40%, #DCCFF5 100%)',
        'brand-sheen':
          'radial-gradient(120% 120% at 0% 0%, rgb(var(--brand-500) / 0.28) 0%, transparent 55%)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      /* Extra opacity steps used by the design system (bg-white/12, ring-brand-500/15 …) */
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      spacing: {
        18: '4.5rem',
        sidebar: 'var(--sidebar-w)',
>>>>>>> origin/main
      },
    },
  },
  plugins: [],
};
