import type { Config } from "tailwindcss";

// Base palette lives here; per-organization brand colors (Section 9 of the
// planning doc) are applied at runtime via CSS custom properties set from
// the resolved Organization record, not baked into this config — an
// agency's brand color isn't known at build time.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--org-primary-color, #4f46e5)",
          secondary: "var(--org-secondary-color, #14b8a6)",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
