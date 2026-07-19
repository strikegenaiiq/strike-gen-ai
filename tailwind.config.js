/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec6ff",
          400: "#59a6ff",
          500: "#3286fc",
          600: "#1d66f0",
          700: "#1651d8",
          800: "#1944ae",
          900: "#1a3d89",
          950: "#142754",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e2",
          300: "#aeb7c9",
          400: "#8190ab",
          500: "#627292",
          600: "#4d5b79",
          700: "#404b63",
          800: "#374053",
          900: "#313847",
          950: "#1f242e",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        glow: "0 0 0 4px rgba(50,134,252,0.15)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};
