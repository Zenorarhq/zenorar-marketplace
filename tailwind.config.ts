import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#43D678',
        'background-dark': '#000000',
        'background-light': '#F8FAFC',
        'surface-dark': '#121212',
        'surface-light': '#1A1A1A',
        'border-dark': '#1F1F1F',
        charcoal: '#121212',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
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
