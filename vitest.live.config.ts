import { defineConfig } from "vitest/config";

/**
 * NVIDIA_NIM.md §46, ARCHITECTURE.md §83 — live provider tests are opt-in
 * and require real credentials. Never part of the default `pnpm test` run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/src/**/*.live.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
