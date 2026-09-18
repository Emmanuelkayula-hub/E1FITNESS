import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests (spec §62/§90 acceptance criteria). Runs against a real
 * `next dev` server backed by the real Postgres dev database — these
 * are not mocked, matching this project's "verify against real data"
 * approach used throughout manual smoke-testing in every phase.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share and mutate the same dev database
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // This environment ships a pre-installed Chromium at a fixed path
    // rather than one matching @playwright/test's expected revision —
    // point at it directly instead of trying to download a new one.
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium",
    },
  },
  webServer: {
    command: "PORT=3100 npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
