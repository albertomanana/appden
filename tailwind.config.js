/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef4ff',
                    100: '#dde9ff',
                    200: '#c2dbff',
                    300: '#9cc2ff',
                    400: '#85adff',
                    500: '#6e9fff',
                    600: '#5391ff',
                    700: '#336fd6',
                    800: '#204b9f',
                    900: '#14356f',
                    950: '#091a35',
                },
                surface: {
                    900: '#000000',
                    800: '#0e0e0e',
                    700: '#131313',
                    600: '#1a1919',
                    500: '#201f1f',
                    400: '#262626',
                    300: '#494847',
                },
                accent: {
                    purple: '#ac8aff',
                    pink: '#ff7ac8',
                    cyan: '#6ee8ff',
                    green: '#9bffce',
                    amber: '#ffc966',
                    red: '#ff716c',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Epilogue', 'Inter', 'system-ui', 'sans-serif'],
                headline: ['Epilogue', 'Inter', 'system-ui', 'sans-serif'],
                body: ['Inter', 'system-ui', 'sans-serif'],
                label: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '1.25rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow-brand': '0 0 24px rgba(133,173,255,0.28)',
                'glow-green': '0 0 24px rgba(155,255,206,0.22)',
                'glow-purple': '0 0 24px rgba(172,138,255,0.24)',
                'card': '0 20px 60px rgba(0,0,0,0.34)',
                'card-hover': '0 30px 90px rgba(0,0,0,0.42)',
                'ambient': '0 0 80px rgba(133,173,255,0.08)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 3s linear infinite',
                'float-soft': 'floatSoft 6s ease-in-out infinite',
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
                floatSoft: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
            },
        },
    },
    plugins: [],
}
