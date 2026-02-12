import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: 'var(--theme-primary, #43D678)',
        secondary: 'var(--theme-secondary, #3B82F6)',
        'background-dark': 'var(--theme-background, #000000)',
        'background-light': '#F8FAFC',
        'surface-dark': 'var(--theme-surface, #121212)',
        'surface-light': 'var(--theme-surface-light, #1A1A1A)',
        'border-dark': 'var(--theme-border, #1F1F1F)',
        charcoal: 'var(--theme-surface, #121212)',
      },
      fontFamily: {
        sans: ['var(--theme-font-body)', 'Inter', 'sans-serif'],
        display: ['var(--theme-font-heading)', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      maxWidth: {
        container: '1440px',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(67, 214, 120, 0.2)',
        'glow-green-lg': '0 0 30px rgba(67, 214, 120, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
