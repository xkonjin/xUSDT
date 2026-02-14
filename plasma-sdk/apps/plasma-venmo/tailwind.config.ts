import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        plenmo: {
          50: "#e8faf0",
          100: "#c5f3da",
          200: "#9fecc3",
          300: "#6be2a6",
          400: "#4ADE80",
          500: "#1DB954",
          600: "#16A34A",
          700: "#148c3f",
          800: "#0f7634",
          900: "#0a5f29",
        },
        // Semantic design system colors
        elevated: "#141419",
        surface: "#1C1C24",
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.06)",
        default: "rgba(255, 255, 255, 0.10)",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
        md: "0 4px 12px rgba(0, 0, 0, 0.25)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.3)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.4)",
        "green-glow": "0 4px 20px rgba(29, 185, 84, 0.25)",
        "green-glow-lg": "0 8px 30px rgba(29, 185, 84, 0.35)",
      },
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      animation: {
        "stagger-fade-up":
          "stagger-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-out": "scale-out 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "stagger-fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
