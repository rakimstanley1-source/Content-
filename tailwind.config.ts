import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens: these resolve to CSS custom properties
        // defined in globals.css, which flip under [data-theme="light"].
        // Using vars here (rather than Tailwind's `dark:` variant) means
        // every component that references e.g. bg-canvas-raised is
        // automatically theme-correct with no dark: prefixes to remember.
        canvas: {
          DEFAULT: "var(--color-canvas)",
          raised: "var(--color-canvas-raised)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          dim: "var(--color-ink-dim)",
          faint: "var(--color-ink-faint)",
        },
        accent: {
          DEFAULT: "#d97b4f",
          dim: "#8a5236",
          soft: "rgba(217,123,79,0.12)",
        },
        good: "#7fae7a",
        bad: "#c56159",
        hairline: {
          DEFAULT: "var(--color-hairline)",
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
