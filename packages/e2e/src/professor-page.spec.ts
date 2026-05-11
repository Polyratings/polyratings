import { expect, test, type Page } from "@playwright/test";

const PROFESSOR_ID = "0038ea39-3910-4f80-9353-41dce33c754d";

async function openInteractiveProfessorPage(page: Page) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/professor/${PROFESSOR_ID}`);
    await expect(page).toHaveURL(new RegExp(`/professor/${PROFESSOR_ID}$`));
    await expect(page.getByRole("button", { name: "Evaluate Professor" }).first()).toBeVisible({
        timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Report Rating" }).first()).toBeVisible({
        timeout: 15_000,
    });
}

test("PROF: professor page renders profile, ratings context, evaluate action, and report controls", async ({
    page,
}) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-1: professor page renders header with professor name and department", async () => {
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(/.+, .+/);
        await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
            /[A-Z]{2,5}\sProfessor/,
        );
    });

    await test.step("PROF-2: ratings are shown by course sections", async () => {
        await expect(
            page
                .locator("h3")
                .filter({ hasText: /[A-Z]{2,5}\s\d{3}/ })
                .first(),
        ).toBeVisible();
    });

    await test.step("PROF-3: evaluate entry point appears for unlocked professor", async () => {
        await expect(
            page.getByRole("button", { name: "Evaluate Professor" }).first(),
        ).toBeVisible();
    });

    await test.step("PROF-4: report controls are available for ratings", async () => {
        await expect(page.getByRole("button", { name: "Report Rating" }).first()).toBeVisible();
    });
});

test("PROF: report submission flow succeeds from professor page", async ({ page }) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-6: report form can be submitted and shows success feedback", async () => {
        await page.getByRole("button", { name: "Report Rating" }).first().click();
        await expect(page.getByRole("heading", { name: "Report Rating" })).toBeVisible();
        await page
            .locator('textarea[name="reason"]:visible')
            .fill("E2E report submission check for moderation pipeline.");
        await page.getByRole("button", { name: "Submit" }).click();

        await expect(
            page.getByText("Thank you for the report. The team will review it soon"),
        ).toBeVisible();
        await expect(page.getByRole("heading", { name: "Report Rating" })).not.toBeVisible();
    });
});

test("PROF: rating submission flow succeeds from professor page", async ({ page }) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-7: evaluate form can be submitted and shows success feedback", async () => {
        await page.getByRole("button", { name: "Evaluate Professor" }).first().click();
        await expect(page.getByRole("heading", { name: /Evaluate .+, .+/ })).toBeVisible();
        await page
            .locator('textarea[name="ratingText"]:visible')
            .fill(`E2E rating submission for ${Date.now()} with adequate detail length.`);
        await page.getByRole("button", { name: "Skip Course Accessibility" }).click();

        await expect(page.getByText("Thank you for your rating")).toBeVisible();
        await expect(page.getByRole("heading", { name: /Evaluate .+, .+/ })).not.toBeVisible();
    });
});
