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

test("LAYOUT: professor page keeps navbar search on mobile", async ({ page }) => {
    const openNavbarSearch = async () => {
        const header = page
            .getByRole("banner")
            .filter({ has: page.getByRole("link", { name: "Polyratings logo" }) });
        await header.getByRole("button", { name: "Search professors" }).click();
        await expect(page.getByRole("combobox", { name: "Professor Auto-complete" })).toBeVisible();
        return header;
    };

    await test.step("LAYOUT-6: professor page navbar search opens from an icon at a phone width", async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/professor/0038ea39-3910-4f80-9353-41dce33c754d");

        await openNavbarSearch();
        const combobox = page
            .locator('[data-slot="mobile-search"]')
            .getByRole("combobox", { name: "Professor Auto-complete" });
        await expect(combobox).toBeVisible();
        await expect(combobox).toBeFocused();
        await expect(page.getByRole("button", { name: "Close search" })).toBeVisible();
        await combobox.fill("smith");
        const firstOption = page.getByRole("option").first();
        await expect(firstOption).toBeVisible();
        // Suggestions must be in-flow (not an absolute dropdown under a clipped panel).
        const optionBox = await firstOption.boundingBox();
        const viewport = page.viewportSize();
        expect(optionBox).toBeTruthy();
        expect(viewport).toBeTruthy();
        expect(optionBox!.y).toBeGreaterThanOrEqual(0);
        expect(optionBox!.y + optionBox!.height).toBeLessThanOrEqual(viewport!.height);
    });

    await test.step("LAYOUT-7: at tablet width search stays an icon beside desktop nav", async () => {
        await page.setViewportSize({ width: 820, height: 900 });
        await page.goto("/professor/0038ea39-3910-4f80-9353-41dce33c754d");

        const header = page
            .getByRole("banner")
            .filter({ has: page.getByRole("link", { name: "Polyratings logo" }) });
        await expect(header.getByRole("link", { name: "Professor List" })).toBeVisible();
        await expect(header.getByRole("button", { name: "Search professors" })).toBeVisible();
        await expect(header.getByRole("combobox", { name: "Professor Auto-complete" })).toHaveCount(
            0,
        );

        await openNavbarSearch();
        await expect(
            page.locator('[data-slot="mobile-search"]').getByRole("combobox", {
                name: "Professor Auto-complete",
            }),
        ).toBeVisible();
        // Close must stay visible on tall-md — Escape-only dismiss is not enough for touch.
        const close = page.getByRole("button", { name: "Close search" });
        await expect(close).toBeVisible();
        await close.click();
        await expect(page.locator('[data-slot="mobile-search"]')).toHaveAttribute(
            "aria-hidden",
            "true",
        );
    });
});
