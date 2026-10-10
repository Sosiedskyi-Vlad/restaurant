export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { 
    extend: {
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-12deg)' },
          '50%': { transform: 'rotate(12deg)' },
        },
        slideUpFade: {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
        slideUpFade: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    } 
  },
  plugins: [],
}
