import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  appType: "mpa",
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        home: resolve(root, "index.html"),
        solutions: resolve(root, "ai-solutions/index.html"),
        contact: resolve(root, "contact/index.html"),
      },
    },
  },
});
