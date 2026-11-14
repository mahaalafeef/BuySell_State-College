import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10243C", // deep navy
        paper: "#EEF2F6", // cool silver-white
        line: "#C9D3DE", // silver border
        muted: "#4F6178",
        brand: { DEFAULT: "#2B5D8C", dark: "#1D4469" }, // steel blue
        tag: "#D5DDE7", // silver
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
