import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../scripts",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    // ARCA-66: overridable so CI can run the stack on its own ports, and so a developer who already
    // has a dev server up can point the suite at a second one rather than fight for :5173.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
  retries: 1,
  // ARCA-66: serial in CI. Every test signs up a fresh account, and the database is SQLite — one
  // writer. Run in parallel and the signups contend: a different test in the same file failed on
  // each local run, always on `#name` timing out, never the same one twice. A gate that fails
  // randomly teaches people to re-run it rather than read it, which is worse than not having it.
  // Left parallel locally, where the speed is worth more than the determinism.
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
});
