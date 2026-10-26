import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

const useLocalWebServer =
    baseURL.startsWith("http://localhost:") || baseURL.startsWith("http://127.0.0.1:");

// `@visual` needs the linux baselines recorded in GitHub Actions. A normal run has none.
const grepInvert: RegExp[] = [];
if (process.env.PLAYWRIGHT_EXCLUDE_WRITE === "true") {
    grepInvert.push(/@write/);
}
if (!process.env.PLAYWRIGHT_VISUAL) {
    grepInvert.push(/@visual/);
}

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
    // Playwright grep matches titles and `tag:` values.
    ...(grepInvert.length > 0 ? { grepInvert } : {}),
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
        toHaveScreenshot: {
            animations: "disabled",
            caret: "hide",
            scale: "css",
            // A few antialiased edge pixels. A shifted control is well past this.
            maxDiffPixelRatio: 0.001,
        },
    },
    snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}-{projectName}-{platform}{ext}",
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
