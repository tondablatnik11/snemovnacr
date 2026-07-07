import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/components/**/*.test.{ts,tsx}", "happy-dom"],
      ["tests/unit/*.test.tsx", "happy-dom"],
    ],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    exclude: ["node_modules", ".next", "dist", "tests/e2e/**"],
    globals: false,
    testTimeout: 30_000,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/types.ts",
        "src/server/db/migrations/**",
        "src/server/db/schema/**",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
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