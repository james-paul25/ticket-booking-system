export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9ddfe",
          300: "#7cc0fd",
          400: "#389dfa",
          500: "#0e7fe8",
          600: "#0263c7",
          700: "#034ea3",
          800: "#074386",
          900: "#0c3970",
          950: "#082449"
        },
        transit: {
          emerald: "#10b981",
          amber: "#f59e0b",
          coral: "#f43f5e"
        }
      },
      boxShadow: {
        "glow": "0 0 20px -3px rgba(14, 127, 232, 0.4)",
        "glow-lg": "0 0 30px -4px rgba(14, 127, 232, 0.5)",
        "seat-selected": "0 0 15px 2px rgba(14, 127, 232, 0.5)",
        "floating": "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
        "floating-dark": "0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 4px 10px -2px rgba(0, 0, 0, 0.4)"
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-up": "slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards"
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" }
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
