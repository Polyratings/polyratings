import { expect, test, type Locator, type Page } from "@playwright/test";

const PROFESSOR_ID = "0038ea39-3910-4f80-9353-41dce33c754d";
const E2E_SEMESTER_COURSE = "AEPS 1101";

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

async function openEvaluateForm(page: Page) {
    await page.getByRole("button", { name: "Evaluate Professor" }).first().click();
    await expect(page.getByRole("heading", { name: /Evaluate .+, .+/ })).toBeVisible();
    return page.getByRole("dialog");
}

async function submitEvaluateForm(page: Page, dialog: Locator, ratingText: string) {
    await dialog.locator('textarea[name="ratingText"]').fill(ratingText);
    await dialog.getByRole("button", { name: "Skip Course Accessibility" }).click();
    await expect(page.getByText("Thank you for your rating")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Evaluate .+, .+/ })).not.toBeVisible();
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
                .filter({ hasText: /[A-Z]{2,5}\s\d{3,4}/ })
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

test("PROF: report submission flow succeeds from professor page", { tag: "@write" }, async ({
    page,
}) => {
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

test("PROF: rating submission via Other and known 4-digit course paths", { tag: "@write" }, async ({
    page,
}) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-7: Other path with typed 4-digit course number succeeds", async () => {
        const dialog = await openEvaluateForm(page);

        await dialog.locator('select[name="knownCourse"]').selectOption("");
        await dialog.locator('select[name="unknownCourseDepartment"]').selectOption("AEPS");
        await dialog.locator('input[name="unknownCourseNumber"]').fill("1101");

        await submitEvaluateForm(
            page,
            dialog,
            `E2E Other-path rating submission for ${Date.now()} with adequate detail length.`,
        );
    });

    await test.step("PROF-8: known 4-digit course dropdown path succeeds", async () => {
        const dialog = await openEvaluateForm(page);

        await expect(dialog.locator('select[name="knownCourse"]')).toContainText(E2E_SEMESTER_COURSE);
        await dialog.locator('select[name="knownCourse"]').selectOption(E2E_SEMESTER_COURSE);
        await expect(dialog.locator('input[name="unknownCourseNumber"]')).toHaveCount(0);

        await submitEvaluateForm(
            page,
            dialog,
            `E2E known-course rating submission for ${Date.now()} with adequate detail length.`,
        );
    });
});
