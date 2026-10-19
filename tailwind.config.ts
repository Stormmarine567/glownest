import type { Config } from 'tailwindcss';

// Design tokens read from the screenshots:
// navy #1B2A4A (buttons, footer, headings), pale blue tint #EFF3FA (hero/section bands),
// card tint #F7F9FC, muted text slate #6B7A90, star yellow #FACC15.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1B2A4A', 700: '#243557', 900: '#141F38' },
        tint: { DEFAULT: '#EFF3FA', soft: '#F7F9FC' },
        ink: '#1B2A4A',
        muted: '#6B7A90',
        line: '#E6EAF1',
        star: '#FACC15',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', pill: '9999px' },
      boxShadow: {
        card: '0 8px 24px -10px rgba(27,42,74,0.18)',
        soft: '0 1px 2px rgba(27,42,74,0.05)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { fadeUp: 'fadeUp .6s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};
export default config;
