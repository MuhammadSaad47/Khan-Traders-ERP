const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-primary-light)",
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-surface)",
        },
        secondary: {
          DEFAULT: "var(--color-text-secondary)",
          foreground: "var(--color-surface)",
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-surface)",
        },
        muted: {
          DEFAULT: "var(--color-border)",
          foreground: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-surface)",
        },
        popover: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text)",
        },
        card: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text)",
        },
      },
      borderRadius: {
        lg: `var(--radius-lg)`,
        md: `var(--radius-md)`,
        sm: `var(--radius-sm)`,
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
