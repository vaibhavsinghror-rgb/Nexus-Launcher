/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#06070a',
          900: '#090b10', // Deep obsidian background
          850: '#0d1017',
          800: '#131822',
          700: '#1b212f'
        },
        slate: {
          900: '#0e121b',
          850: '#151b27',
          800: '#1e2433', // Slate border #1e2433
          700: '#2a3347',
          600: '#3e4b66',
          500: '#5c6d8f',
          400: '#8ba0c2',
          300: '#b8c7de',
          200: '#dce4f0',
          100: '#f1f5f9'
        },
        electric: {
          indigo: '#6366f1',
          indigoHover: '#4f46e5',
          indigoGlow: '#818cf8',
          emerald: '#10b981',
          emeraldHover: '#059669',
          emeraldGlow: '#34d399',
          amber: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#06b6d4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)'
      }
    }
  },
  plugins: []
}
