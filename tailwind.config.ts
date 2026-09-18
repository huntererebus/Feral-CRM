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
        // Pipeline-zone colors: grouped by where a project sits in the
        // production pipeline (see src/lib/design/status-zones.ts), not one
        // color per ProjectStatus value — 13 distinct hues would be noise,
        // not signal.
        zone: {
          production: "#71717a", // NEW..INTERNAL_REVIEW — in-house work, quiet neutral
          "client-review": "#d4a72c", // CLIENT_REVIEW, FINAL_REVIEW — waiting on the client
          revision: "#e0703a", // REVISION_REQUESTED, REVISION_IN_PROGRESS — needs rework
          complete: "#4caf82", // APPROVED, COMPLETED — done
          archived: "#52525b", // ARCHIVED — put away
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
