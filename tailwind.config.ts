import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0a0a0a",
          raised: "#111110",
          light: "#faf9f6",
          "light-raised": "#ffffff",
        },
        ink: {
          DEFAULT: "#f3f1ec",
          dim: "#a3a099",
          faint: "#6b6862",
          light: "#161513",
          "light-dim": "#5c5951",
        },
        accent: {
          DEFAULT: "#d97b4f",
          dim: "#8a5236",
          soft: "rgba(217,123,79,0.12)",
        },
        good: "#7fae7a",
        bad: "#c56159",
        hairline: {
          DEFAULT: "rgba(243,241,236,0.09)",
          light: "rgba(22,21,19,0.09)",
        },
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      borderRadius: {
        card: "6px",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
