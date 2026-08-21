import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    // ARCA-66: both overridable so a second stack can be brought up beside a running dev server —
    // which is what the browser suite needs when someone already has :5173 and :3001 in use.
    // Defaults are unchanged, so `bun run dev` behaves exactly as before.
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
