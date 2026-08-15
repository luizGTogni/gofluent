import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: [
      "packages/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.tsx",
      "apps/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.tsx",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.live.test.ts"],
  },
});
