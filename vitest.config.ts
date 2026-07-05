import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globals: false,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "~/server": path.resolve(__dirname, "./src/server"),
      "~/lib": path.resolve(__dirname, "./src/lib"),
      "~/components": path.resolve(__dirname, "./src/components"),
    },
  },
});