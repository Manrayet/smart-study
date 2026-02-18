// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Necessario per pdfjs-dist: esclude il worker dal bundling
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  build: {
    rollupOptions: {
      // Chunking manuale per performance ottimali
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ai: ["@google/generative-ai"],
          pdf: ["pdfjs-dist"],
        },
      },
    },
  },
});
