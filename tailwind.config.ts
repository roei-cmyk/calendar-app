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
        // KNBL light palette — white surfaces, soft gray hairlines, near-black ink.
        canvas: "#ffffff",
        sidebar: "#f5f5f5",
        line: "#e0e0e0",
        "line-strong": "#d1d5db",
        ink: {
          DEFAULT: "#111111",
          muted: "#6b7280",
          faint: "#9ca3af",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(17 17 17 / 0.06)",
        cardHover: "0 4px 10px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        soft: "0 6px 20px -6px rgb(17 17 17 / 0.12), 0 2px 8px -3px rgb(0 0 0 / 0.06)",
        modal: "0 24px 60px -12px rgb(17 17 17 / 0.22), 0 8px 24px -8px rgb(0 0 0 / 0.12)",
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
