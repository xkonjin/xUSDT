import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Enable dark mode (default theme is dark)
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        plenmo: {
          50: "#e8faf0",
          100: "#c5f3da",
          200: "#9fecc3",
          300: "#6be2a6",
          400: "#3dd88a",
          500: "#1DB954", // Primary brand green
          600: "#19a34a",
          700: "#148c3f",
          800: "#0f7634",
          900: "#0a5f29",
        },
        plasma: {
          50: "#e6fcff",
          100: "#b3f5ff",
          200: "#80eeff",
          300: "#4de7ff",
          400: "#1ae0ff",
          500: "#00d4ff",
          600: "#00aad4",
          700: "#0080a8",
          800: "#00567d",
          900: "#002c52",
        },
        // Semantic colors for design system
        clay: {
          bg: {
            primary: "#0a0a0f",
            secondary: "#12121a",
            card: "#1a1a2e",
            elevated: "#252541",
          },
          border: {
            subtle: "rgba(255, 255, 255, 0.05)",
            default: "rgba(255, 255, 255, 0.1)",
            strong: "rgba(255, 255, 255, 0.15)",
          },
        },
      },
      boxShadow: {
        // Dark mode claymorphism shadows
        clay: "8px 8px 16px rgba(0, 0, 0, 0.4), -4px -4px 12px rgba(255, 255, 255, 0.05), inset 0 2px 4px rgba(255, 255, 255, 0.1)",
        "clay-sm":
          "4px 4px 8px rgba(0, 0, 0, 0.3), -2px -2px 6px rgba(255, 255, 255, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.08)",
        "clay-lg":
          "12px 12px 24px rgba(0, 0, 0, 0.5), -6px -6px 18px rgba(255, 255, 255, 0.06), inset 0 3px 6px rgba(255, 255, 255, 0.12)",
        "clay-pressed":
          "2px 2px 4px rgba(0, 0, 0, 0.3), -1px -1px 3px rgba(255, 255, 255, 0.03), inset 4px 4px 8px rgba(0, 0, 0, 0.3)",
        "clay-inset":
          "inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05)",
        // Green accent glow
        "clay-green":
          "0 4px 20px rgba(29, 185, 84, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "clay-green-hover":
          "0 8px 30px rgba(29, 185, 84, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
      },
      borderRadius: {
        clay: "24px",
        "clay-sm": "16px",
        "clay-lg": "32px",
        "clay-full": "50px",
      },
      animation: {
        "clay-bounce": "clay-bounce 2s ease-in-out infinite",
        "clay-pulse": "clay-pulse 2s ease-in-out infinite",
        "stagger-fade-up":
          "stagger-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-out": "scale-out 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
      },
      keyframes: {
        "clay-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "clay-pulse": {
          "0%, 100%": { boxShadow: "0 4px 20px rgba(29, 185, 84, 0.35)" },
          "50%": { boxShadow: "0 4px 30px rgba(29, 185, 84, 0.5)" },
        },
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
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(29, 185, 84, 0.3)" },
          "50%": {
            boxShadow:
              "0 0 40px rgba(29, 185, 84, 0.6), 0 0 60px rgba(29, 185, 84, 0.2)",
          },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
