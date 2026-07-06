import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "src/**/*.test.ts",
    ],
    exclude: ["node_modules", ".next", "dist", "tests/e2e/**"],
    globals: false,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/types.ts",
        "src/server/db/migrations/**",
        "src/server/db/schema/**",
      ],
      thresholds: {
        // Přísné prahy pro nový kód — pomáhá udržet kvalitu
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