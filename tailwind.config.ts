import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: "rgba(255,255,255,0.10)",
        "glass-edge": "rgba(255,255,255,0.24)",
        "text-secondary": "rgba(255,255,255,0.72)",
        gold: "#FFD76A",
        "sunset-orange": "#FF8E5D",
        "cosmic-blue": "#7FA8FF",
      },
      fontFamily: {
        sans: [
          "var(--font-inter-tight)",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backdropBlur: {
        "2xl": "40px",
        "3xl": "48px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
