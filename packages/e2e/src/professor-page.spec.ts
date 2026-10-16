import { expect, test, type Page } from "@playwright/test";

const PROFESSOR_ID = "0038ea39-3910-4f80-9353-41dce33c754d";

async function selectOption(page: Page, label: string, option: string) {
    await page.getByLabel(label).click();
    await page.getByRole("option", { name: option, exact: true }).click();
}

async function selectStarRating(page: Page, label: string, score: number) {
    await page
        .getByRole("radiogroup", { name: label })
        .getByRole("radio", { name: `${score} out of 4`, exact: true })
        .check();
}

async function openInteractiveProfessorPage(page: Page) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/professor/${PROFESSOR_ID}`);
    await expect(page).toHaveURL(new RegExp(`/professor/${PROFESSOR_ID}$`));
    await expect(page.getByRole("link", { name: "Evaluate Professor" }).first()).toBeVisible({
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
                .filter({ hasText: /[A-Z]{2,5}\s\d{3,4}/ })
                .first(),
        ).toBeVisible();
    });

    await test.step("PROF-3: evaluate entry point appears for unlocked professor", async () => {
        await expect(page.getByRole("link", { name: "Evaluate Professor" }).first()).toHaveAttribute(
            "href",
            `/professor/${PROFESSOR_ID}/eval`,
        );
    });

    await test.step("PROF-4: report controls are available for ratings", async () => {
        await expect(page.getByRole("button", { name: "Report Rating" }).first()).toBeVisible();
    });

    await test.step("PROF-9: professor page links back to the professor list", async () => {
        await expect(page.getByRole("link", { name: "Back to professor list" })).toHaveAttribute(
            "href",
            "/search/name",
        );
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

test("PROF: rating submission flow succeeds from professor page", { tag: "@write" }, async ({
    page,
}) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-7: evaluate form can be submitted and shows success feedback", async () => {
        await page.getByRole("link", { name: "Evaluate Professor" }).first().click();
        await expect(page).toHaveURL(new RegExp(`/professor/${PROFESSOR_ID}/eval$`));
        await expect(page.getByRole("heading", { name: /Evaluate .+, .+/ })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Evaluation steps" })).toBeVisible();

        await page.getByLabel("Course").click();
        await page.getByRole("option").first().click();
        await selectOption(page, "Year", "Freshman");
        await selectOption(page, "Grade Achieved", "A");
        await selectOption(page, "Reason For Taking", "Major (Required)");
        await selectStarRating(page, "Overall Rating", 4);
        await selectStarRating(page, "Recognizes Difficulties", 4);
        await selectStarRating(page, "Presents Clearly", 4);
        await page
            .locator('textarea[name="ratingText"]:visible')
            .fill(`E2E rating submission for ${Date.now()} with adequate detail length.`);

        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("group", { name: "Tags" })).toBeVisible();

        await page.getByRole("button", { name: "Next" }).click();
        await expect(
            page.getByText("This is how your review will appear on the professor page"),
        ).toBeVisible();
        await page
            .getByRole("checkbox", {
                name: "I took this class, this review is my opinion, and I license Polyratings to host, moderate, display, and republish it.",
            })
            .check();
        await page.getByRole("button", { name: "Submit" }).click();

        await expect(page.getByText("Thank you for your rating")).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/professor/${PROFESSOR_ID}$`));
    });
});

test("PROF: evaluate page returns to professor page", async ({ page }) => {
    await openInteractiveProfessorPage(page);

    await test.step("PROF-8: evaluate page links back to the professor page", async () => {
        await page.getByRole("link", { name: "Evaluate Professor" }).first().click();
        await expect(page).toHaveURL(new RegExp(`/professor/${PROFESSOR_ID}/eval$`));
        await expect(page.getByRole("link", { name: "Back to professor" })).toHaveAttribute(
            "href",
            `/professor/${PROFESSOR_ID}`,
        );
    });
});
