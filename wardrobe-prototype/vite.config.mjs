import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone dev server just for previewing closet-prototype.jsx.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: { port: 5180, open: false },
});
