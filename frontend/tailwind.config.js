/**
 * apple-design.md §15 — трекінг залежить від кегля: дрібний текст трохи
 * розріджений, великий — стиснутий. Значення пораховано за формулою
 * Inter Dynamic Metrics: tracking = -0.0223 + 0.185 * e^(-0.1745 * px).
 * Line-height лишаємо стандартним Tailwind (він уже зменшується з ростом кегля),
 * щоб не зсунути верстку.
 */
const typeScale = {
  '4xs': ['0.5625rem', { letterSpacing: '0.016em' }],                       //  9px
  '3xs': ['0.625rem',  { letterSpacing: '0.01em' }],                        // 10px
  '2xs': ['0.6875rem', { letterSpacing: '0.005em' }],                       // 11px
  xs:    ['0.75rem',   { lineHeight: '1rem',    letterSpacing: '0em' }],      // 12px
  sm:    ['0.875rem',  { lineHeight: '1.25rem', letterSpacing: '-0.006em' }], // 14px
  base:  ['1rem',      { lineHeight: '1.5rem',  letterSpacing: '-0.011em' }], // 16px
  lg:    ['1.125rem',  { lineHeight: '1.75rem', letterSpacing: '-0.014em' }], // 18px
  xl:    ['1.25rem',   { lineHeight: '1.75rem', letterSpacing: '-0.017em' }], // 20px
  '2xl': ['1.5rem',    { lineHeight: '2rem',    letterSpacing: '-0.019em' }], // 24px
  '3xl': ['1.875rem',  { lineHeight: '2.25rem', letterSpacing: '-0.021em' }], // 30px
  '4xl': ['2.25rem',   { lineHeight: '2.5rem',  letterSpacing: '-0.022em' }], // 36px
  '5xl': ['3rem',      { lineHeight: '1',       letterSpacing: '-0.022em' }],
  '6xl': ['3.75rem',   { lineHeight: '1',       letterSpacing: '-0.022em' }],
};

export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { 
    extend: {
      fontSize: typeScale,
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // apple-design.md §1/§4 — відгук миттєвий, загасання м'яке.
      // Замість ease-in-out (повільний старт) — ease-out-криві.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 1, 0.5, 1)',
        out: 'cubic-bezier(0.25, 1, 0.5, 1)',
        // наближення критично демпфованої пружини (damping 1.0, response ≈ 0.35 s)
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-12deg)' },
          '50%': { transform: 'rotate(12deg)' },
        },
        slideUpFade: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
        // єдине джерело правди (раніше дублювалося в index.css з іншими значеннями)
        slideUpFade: 'slideUpFade 0.32s cubic-bezier(0.32, 0.72, 0, 1) both',
        // раніше використовувався, але ніде не був визначений
        fadeIn: 'fadeIn 0.2s cubic-bezier(0.25, 1, 0.5, 1) both',
      }
    } 
  },
  plugins: [],
}
