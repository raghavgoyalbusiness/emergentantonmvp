/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Georgia', 'serif'],
        body: ['"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0A0F2E',
          surface: '#131936',
          elevated: '#1A2247',
        },
        teal: {
          DEFAULT: '#00D4C8',
          dim: 'rgba(0,212,200,0.15)',
          border: 'rgba(0,212,200,0.3)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'glow-pulse': { '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,200,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(0,212,200,0.7)' } },
        'slide-in-left': { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'score-fill': { '0%': { strokeDashoffset: '100' }, '100%': { strokeDashoffset: '0' } },
        'spotlight': {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.4s ease-out forwards',
        'spotlight': 'spotlight 2s ease 0.75s 1 forwards',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
