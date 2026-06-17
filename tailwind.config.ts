import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0a0a0a",
        "primary-active": "#1f1f1f",
        ink: "#0a0a0a",
        body: "#3a3a3a",
        "body-strong": "#1a1a1a",
        muted: "#6a6a6a",
        "muted-soft": "#9a9a9a",
        hairline: "#e5e5e5",
        "hairline-soft": "#f0f0f0",
        canvas: "#fffaf0",
        paper: "#fffaf0",
        "surface-soft": "#faf5e8",
        "surface-card": "#f5f0e0",
        "surface-strong": "#ebe6d6",
        "surface-dark": "#0a1a1a",
        "surface-dark-elevated": "#1a2a2a",
        "on-primary": "#ffffff",
        "on-dark": "#ffffff",
        "on-dark-soft": "#a0a0a0",
        "brand-pink": "#ff4d8b",
        "brand-teal": "#1a3a3a",
        "brand-lavender": "#b8a4ed",
        "brand-peach": "#ffb084",
        "brand-ochre": "#e8b94a",
        "brand-mint": "#a4d4c5",
        "brand-coral": "#ff6b5a",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        cream: "#f5f0e0",
        sage: "#a4d4c5",
        tomato: "#ef4444",
        brass: "#e8b94a",
        blueberry: "#b8a4ed"
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "24px"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(10, 10, 10, 0.06)",
        lift: "0 16px 32px rgba(10, 10, 10, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
