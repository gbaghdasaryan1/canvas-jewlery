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
    allowedHosts: ["host.docker.internal"],
    // Forward the order/OTP API to the backend (port 5050) so the app can hit
    // same-origin "/otp/*" and "/orders" paths in dev — no CORS, VITE_API_BASE
    // stays empty. Override the target with VITE_DEV_API_TARGET if needed.
    proxy: {
      "/otp": {
        target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:5050",
        changeOrigin: true,
      },
      "/orders": {
        target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
});
