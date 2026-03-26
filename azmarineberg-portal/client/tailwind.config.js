/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0d5c2e",
          light: "#107a3d",
          dark: "#0a4722",
        },
        accent: {
          DEFAULT: "#1e40af",
          light: "#3b82f6",
          dark: "#1e3a8a",
        },
        regulatory: {
          green: "#16a34a",
          amber: "#d97706",
          red: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
