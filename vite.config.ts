import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5174,
    proxy: {
      // Intercepts any frontend request starting with '/maps-api'
      '/maps-api': {
        target: 'https://googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-api/, '')
      }
    }
  }
});
