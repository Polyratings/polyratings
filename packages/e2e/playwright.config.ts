import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

const useLocalWebServer =
    baseURL.startsWith("http://localhost:") || baseURL.startsWith("http://127.0.0.1:");

export default defineConfig({
    testDir: "./src",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI
        ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
        : [["list"]],
    outputDir: "test-results",
    timeout: 30_000,
    // Playwright grep matches titles and `tag:` values. Exclude mutating specs in production.
    ...(process.env.PLAYWRIGHT_EXCLUDE_WRITE === "true" ? { grepInvert: /@write/ } : {}),
    ...(useLocalWebServer
        ? {
              webServer: {
                  command: "npm run start:local",
                  cwd: "../..",
                  url: baseURL,
                  reuseExistingServer: !process.env.CI,
                  timeout: 180_000,
              },
          }
        : {}),
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
        extraHTTPHeaders: {
            // Backend no-ops Discord when this is set, even if beta notifications are enabled.
            "x-polyratings-skip-notifications": "1",
        },
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
