/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand palette - deep dark with electric accent
                brand: {
                    50: '#f0f4ff',
                    100: '#e0e9ff',
                    200: '#c7d7fe',
                    300: '#a5b8fc',
                    400: '#818cf8',
                    500: '#6366f1', // main brand indigo
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                // Surface / dark backgrounds
                surface: {
                    900: '#0a0a0f', // deepest bg
                    800: '#0f0f1a', // main bg
                    700: '#13131f', // card bg
                    600: '#1a1a2e', // elevated card
                    500: '#22223b', // borders/dividers
                    400: '#2d2d47', // hover states
                    300: '#3d3d5c', // subtle borders
                },
                // Accent colors
                accent: {
                    purple: '#7c3aed',
                    pink: '#ec4899',
                    cyan: '#06b6d4',
                    green: '#10b981',
                    amber: '#f59e0b',
                    red: '#ef4444',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow-brand': '0 0 20px rgba(99,102,241,0.3)',
                'glow-green': '0 0 20px rgba(16,185,129,0.3)',
                'glow-purple': '0 0 20px rgba(124,58,237,0.3)',
                'card': '0 4px 24px rgba(0,0,0,0.4)',
                'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 3s linear infinite',
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
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
