import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app only renders reviewed data fetched from /api at runtime; nothing from
// results/ or private state is bundled. There is deliberately no public/ directory.
export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://localhost:4173" } },
});
