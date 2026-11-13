import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212B",
        paper: "#F3F6F7",
        line: "#D3DBE0",
        muted: "#586873",
        brand: { DEFAULT: "#0E5E6F", dark: "#0A4654" },
        tag: "#F4C542",
        danger: "#B3261E",
        ok: "#1E7A4F",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
