import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#f5f3ff",
        sidebar: "#1e1b4b",
        "sidebar-light": "#2e2a6e",
        line: "#ddd6fe",
        "line-strong": "#c4b5fd",
        brand: {
          DEFAULT: "#7c3aed",
          light: "#a78bfa",
          lighter: "#ede9fe",
          dark: "#4c1d95",
          muted: "#6d28d9",
        },
        ink: {
          DEFAULT: "#1e1b4b",
          muted: "#6b7280",
          faint: "#9ca3af",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(124 58 237 / 0.06), 0 1px 3px 0 rgb(124 58 237 / 0.08)",
        cardHover: "0 4px 10px -2px rgb(124 58 237 / 0.15), 0 2px 4px -2px rgb(124 58 237 / 0.1)",
        soft: "0 6px 20px -6px rgb(124 58 237 / 0.2), 0 2px 8px -3px rgb(76 29 149 / 0.1)",
        modal: "0 24px 60px -12px rgb(76 29 149 / 0.35), 0 8px 24px -8px rgb(124 58 237 / 0.2)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
