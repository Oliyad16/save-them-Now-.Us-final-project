import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mission-themed color palette
        mission: {
          primary: '#2563eb', // Blue for hope and trust
          secondary: '#dc2626', // Red for urgency and children
          accent: '#16a34a', // Green for veterans and success
          warning: '#f59e0b', // Amber for caution
          dark: '#0f172a', // Deep dark for backgrounds
          gray: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          },
        },
        // Badge colors
        badge: {
          guardian: '#10b981', // Guardian Angel - emerald
          hope: '#3b82f6', // Hope Bringer - blue
          lifesaver: '#f59e0b', // Life Saver - amber
          hero: '#8b5cf6', // Missing Hero Champion - violet
          diamond: '#06b6d4', // Diamond Defender - cyan
          detective: '#ec4899', // Case Detective - pink
          voice: '#84cc16', // Community Voice - lime
          expert: '#f97316', // Safety Expert - orange
          responder: '#ef4444', // First Responder - red
          streak: '#6366f1', // Streak Keeper - indigo
        },
        // Tier colors
        tier: {
          free: '#6b7280',
          basic: '#3b82f6',
          premium: '#8b5cf6',
          hero: '#f59e0b',
          champion: '#ef4444',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mission': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'gradient-hero': 'linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #16a34a 100%)',
        'gradient-badge': 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #10b981 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'badge-unlock': 'badgeUnlock 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'notification': 'notification 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #3b82f6' },
          '100%': { boxShadow: '0 0 20px #3b82f6, 0 0 30px #3b82f6' },
        },
        badgeUnlock: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(-90deg)', opacity: '0.8' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        notification: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-red': '0 0 20px rgba(220, 38, 38, 0.5)',
        'glow-green': '0 0 20px rgba(22, 163, 74, 0.5)',
        'badge': '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'tier': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      fontFamily: {
        'mission': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}
export default config