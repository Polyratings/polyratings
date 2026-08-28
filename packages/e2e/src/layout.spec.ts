import { expect, test } from "@playwright/test";

const footerCopy =
    "Polyratings is a student and alumni-run project and is not affiliated with, endorsed by, or an official service of Cal Poly.";

test("LAYOUT: public pages show Cal Poly non-affiliation footer", async ({ page }) => {
    await test.step("LAYOUT-1: home, FAQ, and About render the non-affiliation footer", async () => {
        for (const path of ["/", "/faq", "/about"]) {
            await page.goto(path);
            await expect(page.getByRole("contentinfo")).toHaveText(footerCopy);
        }
    });
});

test("LAYOUT: short pages pin the footer to the viewport bottom", async ({ page }) => {
    await test.step("LAYOUT-2: login rests the footer at the bottom without scrolling", async () => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto("/login");

        const footer = page.getByRole("contentinfo");
        await expect(footer).toBeVisible();

        const { footerBottom, viewportHeight, scrollOverflow } = await page.evaluate(() => {
            const scroll = document.getElementById("app-scroll");
            return {
                footerBottom: document.querySelector("footer")!.getBoundingClientRect().bottom,
                viewportHeight: window.innerHeight,
                scrollOverflow: scroll ? scroll.scrollHeight - scroll.clientHeight : 0,
            };
        });

        expect(Math.abs(footerBottom - viewportHeight)).toBeLessThanOrEqual(2);
        expect(scrollOverflow).toBeLessThanOrEqual(1);
    });
});

test("LAYOUT: theme toggle overrides and remembers the scheme", async ({ page }) => {
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const toggle = page.getByRole("button", { name: /^Switch to / }).first();

    await test.step("LAYOUT-3: a first visit follows the operating system", async () => {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto("/");
        expect(await isDark()).toBe(true);

        await page.emulateMedia({ colorScheme: "light" });
        await page.goto("/");
        expect(await isDark()).toBe(false);
    });

    await test.step("LAYOUT-4: the control switches between light and dark", async () => {
        await expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");

        await toggle.click();
        expect(await isDark()).toBe(true);
        await expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");

        await toggle.click();
        expect(await isDark()).toBe(false);
        await expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");
    });

    await test.step("LAYOUT-5: a chosen theme survives a reload", async () => {
        // The emulated system scheme is light, so dark can only be the stored choice.
        await toggle.click();
        expect(await isDark()).toBe(true);

        await page.reload();
        expect(await isDark()).toBe(true);
        await expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");
    });
});
