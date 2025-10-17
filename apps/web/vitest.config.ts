import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    pool: "forks",
  },
  resolve: {
    alias: {
      "@web": path.resolve(__dirname, "./"),
      "@db": path.resolve(__dirname, "../../packages/db"),
      "@llm": path.resolve(__dirname, "../../packages/llm"),
      "@pdfkit": path.resolve(__dirname, "../../packages/pdfkit"),
      "@ocr": path.resolve(__dirname, "../../packages/ocr"),
      "@policy": path.resolve(__dirname, "../../packages/policy"),
    },
  },
});
