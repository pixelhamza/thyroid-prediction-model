import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // relative asset paths so the build also works when FastAPI serves it from /
  base: "./",
  server: {
    // during `npm run dev` the API runs separately on 8000 — proxy avoids CORS
    proxy: {
      "/predict": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
