/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07060a",
          900: "#0d0c12",
          800: "#15131c",
          700: "#1f1c2a",
          600: "#2a2638",
        },
        gold: {
          50: "#fbf6e6",
          100: "#f5e9b6",
          200: "#ecd684",
          300: "#e0bf52",
          400: "#d4af37",
          500: "#bf972c",
          600: "#9a7820",
          700: "#6f5616",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.35), 0 10px 40px -10px rgba(212,175,55,0.25)",
        goldlg: "0 0 0 1px rgba(212,175,55,0.55), 0 30px 80px -20px rgba(212,175,55,0.35)",
      },
      backgroundImage: {
        "gold-shine":
          "linear-gradient(135deg, #f5e9b6 0%, #d4af37 35%, #bf972c 60%, #f5d97a 100%)",
        "ink-radial":
          "radial-gradient(ellipse at top, rgba(212,175,55,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(120,80,200,0.10), transparent 55%), #07060a",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glow: {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 6s linear infinite",
        floaty: "floaty 4s ease-in-out infinite",
        glow: "glow 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
