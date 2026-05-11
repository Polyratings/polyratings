import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

const useLocalWebServer =
    baseURL.startsWith("http://localhost:") || baseURL.startsWith("http://127.0.0.1:");

export default defineConfig({
    testDir: "./src",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
    timeout: 30_000,
    ...(useLocalWebServer
        ? {
              webServer: {
                  command: "npm run start:local",
                  cwd: "../frontend",
                  url: baseURL,
                  reuseExistingServer: !process.env.CI,
                  timeout: 120_000,
              },
          }
        : {}),
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
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
