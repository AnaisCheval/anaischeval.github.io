import { defineConfig, devices } from "@playwright/test";

const port = 8081;

export default defineConfig({
  testDir: "tests",
  reporter: [["list"]],
  timeout: 60_000,
  workers: process.env.CI ? 2 : undefined,
  use: { baseURL: `http://localhost:${port}`, ...devices["Desktop Chrome"] },
  // Serve the built _site/ the way GitHub Pages does (see tests/serve.js).
  webServer: { command: `node tests/serve.js _site ${port}`, url: `http://localhost:${port}/`, reuseExistingServer: true },
});
