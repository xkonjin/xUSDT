import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Splitzy Brand Colors - Teal
        splitzy: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Primary brand color
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Participant colors for bill splitting
        participant: {
          teal: '#14b8a6',
          coral: '#fb7185',
          amber: '#fbbf24',
          violet: '#a78bfa',
          emerald: '#34d399',
          orange: '#fb923c',
          pink: '#f472b6',
          sky: '#38bdf8',
        },
        // Legacy plasma colors (for compatibility)
        plasma: {
          50: '#e6fcff',
          100: '#b3f5ff',
          200: '#80eeff',
          300: '#4de7ff',
          400: '#1ae0ff',
          500: '#00d4ff',
          600: '#00aad4',
          700: '#0080a8',
          800: '#00567d',
          900: '#002c52',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'clay': '24px',
        'clay-lg': '32px',
        'clay-pill': '50px',
      },
      boxShadow: {
        // Claymorphism shadows
        'clay': '8px 8px 20px rgba(166, 180, 200, 0.25), -8px -8px 20px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(166, 180, 200, 0.08)',
        'clay-sm': '4px 4px 12px rgba(166, 180, 200, 0.2), -4px -4px 12px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.5), inset -1px -1px 2px rgba(166, 180, 200, 0.05)',
        'clay-lg': '12px 12px 28px rgba(166, 180, 200, 0.3), -12px -12px 28px rgba(255, 255, 255, 0.98), inset 2px 2px 6px rgba(255, 255, 255, 0.7), inset -2px -2px 6px rgba(166, 180, 200, 0.1)',
        'clay-pressed': '2px 2px 6px rgba(166, 180, 200, 0.2), -2px -2px 6px rgba(255, 255, 255, 0.8), inset 4px 4px 10px rgba(166, 180, 200, 0.15), inset -2px -2px 6px rgba(255, 255, 255, 0.5)',
        'clay-inset': 'inset 4px 4px 10px rgba(166, 180, 200, 0.15), inset -4px -4px 10px rgba(255, 255, 255, 0.95)',
        // Teal glow for buttons
        'clay-teal': '6px 6px 16px rgba(13, 148, 136, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.6), inset 2px 2px 4px rgba(255, 255, 255, 0.4), inset -2px -2px 4px rgba(13, 148, 136, 0.2)',
        'clay-teal-hover': '8px 8px 20px rgba(13, 148, 136, 0.45), -6px -6px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(255, 255, 255, 0.5), inset -2px -2px 4px rgba(13, 148, 136, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'clay-bounce': 'clayBounce 2s ease-in-out infinite',
        'step-complete': 'stepComplete 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        clayBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        stepComplete: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
