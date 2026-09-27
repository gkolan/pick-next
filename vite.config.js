import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // relative asset URLs: works at a domain root or a sub-path
  server: { port: 5173, open: false },
  build: { target: "es2022" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
