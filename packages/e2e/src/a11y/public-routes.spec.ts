import { expect, test } from "../support/axe-test";

test("@a11y A11Y-PUB: home route accessibility baseline", async ({
    page,
    scanForA11yViolations,
}) => {
    await test.step("A11Y-PUB-1: home route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/");
        await page.waitForLoadState("load");
        await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
        await scanForA11yViolations();
    });
});

test("@a11y A11Y-PUB: about route accessibility baseline", async ({
    page,
    scanForA11yViolations,
}) => {
    await test.step("A11Y-PUB-2: about route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/about");
        await page.waitForLoadState("load");
        await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
        await scanForA11yViolations();
    });
});

test("@a11y A11Y-PUB: FAQ route accessibility baseline", async ({ page, scanForA11yViolations }) => {
    await test.step("A11Y-PUB-3: FAQ route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/faq");
        await page.waitForLoadState("load");
        await expect(
            page.getByRole("heading", { name: "Frequently Asked Questions" }),
        ).toBeVisible();
        await scanForA11yViolations();
    });
});

test("@a11y A11Y-PUB: new professor route accessibility baseline", async ({
    page,
    scanForA11yViolations,
}) => {
    await test.step("A11Y-PUB-4: new professor route has no WCAG 2.x A/AA violations", async () => {
        await page.goto("/new-professor");
        await page.waitForLoadState("load");
        await expect(page.getByRole("heading", { name: "Add a Professor" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Professor details" })).toBeVisible();
        await scanForA11yViolations();
    });
});

test.describe("dark color scheme", () => {
    // Dark mode is driven by `prefers-color-scheme` alone, so emulating the OS
    // setting is the only way in — there is no toggle to click.
    test.use({ colorScheme: "dark" });

    test("@a11y A11Y-PUB: home route accessibility baseline in dark mode", async ({
        page,
        scanForA11yViolations,
    }) => {
        await test.step("A11Y-PUB-5: home route has no WCAG 2.x A/AA violations in dark mode", async () => {
            await page.goto("/");
            await page.waitForLoadState("load");
            await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
            await expect(page.getByRole("link", { name: "Add a Professor" }).first()).toBeVisible();
            await expect(page.getByRole("link", { name: "Professor List" }).first()).toBeVisible();
            await scanForA11yViolations();
        });
    });

    test("@a11y A11Y-PUB: about route accessibility baseline in dark mode", async ({
        page,
        scanForA11yViolations,
    }) => {
        await test.step("A11Y-PUB-6: about route has no WCAG 2.x A/AA violations in dark mode", async () => {
            await page.goto("/about");
            await page.waitForLoadState("load");
            await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
            await scanForA11yViolations();
        });
    });

    test("@a11y A11Y-PUB: FAQ route accessibility baseline in dark mode", async ({
        page,
        scanForA11yViolations,
    }) => {
        await test.step("A11Y-PUB-7: FAQ route has no WCAG 2.x A/AA violations in dark mode", async () => {
            await page.goto("/faq");
            await page.waitForLoadState("load");
            await expect(
                page.getByRole("heading", { name: "Frequently Asked Questions" }),
            ).toBeVisible();
            await scanForA11yViolations();
        });
    });

    test("@a11y A11Y-PUB: new professor route accessibility baseline in dark mode", async ({
        page,
        scanForA11yViolations,
    }) => {
        await test.step("A11Y-PUB-8: new professor route has no WCAG 2.x A/AA violations in dark mode", async () => {
            await page.goto("/new-professor");
            await page.waitForLoadState("load");
            await expect(page.getByRole("heading", { name: "Add a Professor" })).toBeVisible();
            await expect(page.getByRole("group", { name: "Professor details" })).toBeVisible();
            await scanForA11yViolations();
        });
    });
});
