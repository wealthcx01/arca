import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../scripts",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
  retries: 1,
  reporter: "list",
});
