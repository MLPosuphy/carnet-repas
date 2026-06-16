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
        ink: "#24201c",
        paper: "#fbfaf7",
        cream: "#f3efe7",
        sage: "#6d8a6f",
        tomato: "#c9573f",
        brass: "#b78943",
        blueberry: "#4d638c"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(36, 32, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
