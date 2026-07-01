/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { 
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          brandPurple: 'hsl(var(--primary))',
          successGreen: '#10b981',
          errorRed: '#ef4444'
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
          'apple-ease': 'cubic-bezier(0.16, 1, 0.3, 1)', // Apple tarzı kusursuz akış
      },
      boxShadow: {
          'float': '0 20px 40px -10px rgba(0,0,0,0.08)',
          'glow': '0 0 30px rgba(109, 40, 217, 0.3)',
          'vip-glow': '0 0 40px rgba(255, 215, 0, 0.15)',
          'vip-card': '0 30px 60px -10px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.12)' // Üstten ışık vuran cam efekti
      },
      animation: { 
          // V3 YENİ NESİL ANİMASYONLAR
          'card-enter': 'cardEnter 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'glimmer': 'glimmer 4s ease-in-out infinite alternate',
          'orb-float': 'orbFloat 10s ease-in-out infinite alternate',
          'parallax-slow': 'parallax 60s linear infinite',
          'parallax-med': 'parallax 40s linear infinite',
          'parallax-fast': 'parallax 20s linear infinite',
          
          // Eski animasyonlar
          'fade-in-up': 'fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'scale-in': 'scaleIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'bounce-slight': 'bounceSlight 2s infinite',
          'spin-slow': 'spin 4s linear infinite', 
      },
      keyframes: {
          // Kartın aşağıdan, yavaşça büyüyerek ve opaklaşarak süzülmesi
          cardEnter: { 
              '0%': { opacity: 0, transform: 'translateY(40px) scale(0.95)' }, 
              '100%': { opacity: 1, transform: 'translateY(0) scale(1)' } 
          },
          // Altın ve mor renklerin nefes alır gibi parlaması
          glimmer: { 
              '0%': { opacity: 0.6, filter: 'brightness(1)' }, 
              '100%': { opacity: 1, filter: 'brightness(1.3)' } 
          },
          // Arkadaki renk kürelerinin (Orbs) yavaşça süzülmesi
          orbFloat: { 
              '0%': { transform: 'translateY(0px) scale(1)' }, 
              '100%': { transform: 'translateY(-30px) scale(1.05)' } 
          },
          // 3 Katmanlı yıldızların yukarı doğru sonsuz akışı
          parallax: { 
              '0%': { transform: 'translateY(0)' }, 
              '100%': { transform: 'translateY(-1000px)' } 
          },
          
          fadeInUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
          scaleIn: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
          bounceSlight: { '0%, 100%': { transform: 'translateY(-5%)' }, '50%': { transform: 'translateY(0)' } },
      }
    }
  },
  plugins: [],
}
