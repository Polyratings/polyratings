import { expect, test, type Page } from "@playwright/test";

const desktop = { width: 1280, height: 800 };
const phone = { width: 390, height: 844 };
const maxShotHeight = 8_000;

/**
 * The app scrolls `#app-scroll`, so a window `fullPage` shot clips the page.
 * Grow the viewport until that pane can show its content in one frame.
 */
async function fitContent(page: Page) {
    const width = page.viewportSize()?.width ?? desktop.width;
    const height = await page.evaluate((max) => {
        const nav = document.querySelector("header");
        const scroll = document.getElementById("app-scroll");
        const navHeight = nav?.getBoundingClientRect().height ?? 0;
        const contentHeight = scroll?.scrollHeight ?? window.innerHeight;
        return Math.min(max, Math.ceil(navHeight + contentHeight));
    }, maxShotHeight);
    await page.setViewportSize({ width, height });
}

async function settlePaint(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        const urls = new Set<string>();
        for (const el of document.querySelectorAll("*")) {
            const bg = getComputedStyle(el).backgroundImage;
            for (const match of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
                const url = match[1];
                if (url && !url.startsWith("data:")) {
                    urls.add(url);
                }
            }
        }
        await Promise.all(
            [...urls].map(
                (src) =>
                    new Promise<void>((resolve) => {
                        const image = new Image();
                        image.onload = () => resolve();
                        image.onerror = () => resolve();
                        image.src = src;
                    }),
            ),
        );
    });
}

async function shoot(page: Page, name: string, mode: "viewport" | "content") {
    if (mode === "content") {
        await fitContent(page);
    }
    await settlePaint(page);
    // Rating-derived. Mask it so a sliver in the viewport is not part of the diff.
    const carousel = page.getByRole("region", { name: "Best of the Best" });
    await expect(page).toHaveScreenshot(`${name}.png`, {
        mask: (await carousel.count()) > 0 ? [carousel] : [],
    });
}

async function openPage(page: Page, path: string) {
    await page.goto(path);
}

test.describe("visual baselines", { tag: "@visual" }, () => {
    test.describe.configure({ timeout: 60_000 });
    test.use({ colorScheme: "light", reducedMotion: "reduce" });

    test.describe("desktop", () => {
        test.use({ viewport: desktop });

        test("VISUAL: home desktop light matches the baseline", async ({ page }) => {
            await test.step("VIS-1: home hero at desktop light", async () => {
                await openPage(page, "/");
                await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
                await shoot(page, "home-desktop-light", "viewport");
            });
        });

        test("VISUAL: about page light matches the baseline", async ({ page }) => {
            await test.step("VIS-5: about page at desktop light", async () => {
                await openPage(page, "/about");
                await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
                await shoot(page, "about-desktop-light", "content");
            });
        });

        test("VISUAL: FAQ page light matches the baseline", async ({ page }) => {
            await test.step("VIS-7: FAQ page at desktop light", async () => {
                await openPage(page, "/faq");
                await expect(
                    page.getByRole("heading", { name: "Frequently Asked Questions" }),
                ).toBeVisible();
                await shoot(page, "faq-desktop-light", "content");
            });
        });

        test("VISUAL: login page light matches the baseline", async ({ page }) => {
            await test.step("VIS-8: login page at desktop light", async () => {
                await openPage(page, "/login");
                await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
                await shoot(page, "login-desktop-light", "viewport");
            });
        });

        test("VISUAL: not-found page matches the baseline", async ({ page }) => {
            await test.step("VIS-10: unknown route at desktop light", async () => {
                await openPage(page, "/nothing-to-see-here");
                await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
                await shoot(page, "not-found-desktop-light", "content");
            });
        });

        test("VISUAL: new professor page matches the baseline", async ({ page }) => {
            await test.step("VIS-11: empty add-a-professor form", async () => {
                await openPage(page, "/new-professor");
                await expect(page.getByRole("heading", { name: "Add a Professor" })).toBeVisible();
                await shoot(page, "new-professor-desktop-light", "content");
            });
        });
    });

    test.describe("dark desktop", () => {
        test.use({ viewport: desktop, colorScheme: "dark" });

        test("VISUAL: home desktop dark matches the baseline", async ({ page }) => {
            await test.step("VIS-2: home hero at desktop dark", async () => {
                await openPage(page, "/");
                await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
                await shoot(page, "home-desktop-dark", "viewport");
            });
        });

        test("VISUAL: about page dark matches the baseline", async ({ page }) => {
            await test.step("VIS-6: about page at desktop dark", async () => {
                await openPage(page, "/about");
                await expect(page.getByRole("heading", { name: "About Polyratings" })).toBeVisible();
                await shoot(page, "about-desktop-dark", "content");
            });
        });

        test("VISUAL: login page dark matches the baseline", async ({ page }) => {
            await test.step("VIS-9: login page at desktop dark", async () => {
                await openPage(page, "/login");
                await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
                await shoot(page, "login-desktop-dark", "viewport");
            });
        });
    });

    test.describe("phone", () => {
        test.use({ viewport: phone });

        test("VISUAL: home phone light matches the baseline", async ({ page }) => {
            await test.step("VIS-3: home hero on a phone", async () => {
                await openPage(page, "/");
                await expect(page.getByRole("heading", { name: "Polyratings" })).toBeVisible();
                await shoot(page, "home-phone-light", "viewport");
            });
        });

        test("VISUAL: phone search sheet matches the baseline", async ({ page }) => {
            await test.step("VIS-4: full-screen search before typing", async () => {
                await openPage(page, "/");
                await page.getByRole("button", { name: "Search professors" }).click();
                const sheet = page.locator("[data-slot=mobile-search]");
                await expect(
                    sheet.getByRole("combobox", { name: "Professor Auto-complete" }),
                ).toBeFocused();
                await shoot(page, "home-phone-search-light", "viewport");
            });
        });
    });
});
