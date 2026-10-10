// Tailwind v4 is handled by @tailwindcss/vite in vite.config.ts, NOT via PostCSS.
// This file only handles autoprefixer for vendor prefix compatibility.
export default {
  plugins: {
    autoprefixer: {},
  },
}
