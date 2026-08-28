import { expect, test, type Page } from "@playwright/test";

async function selectCombobox(page: Page, label: string, value = "CSC") {
    const field = page.getByLabel(label);
    await field.click();
    await field.fill(value);
    await page.getByRole("option", { name: value, exact: true }).click();
}

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

async function fillRequiredReviewFields(page: Page) {
    await selectCombobox(page, "Course Prefix");
    await page.locator('input[name="courseNum"]:visible').fill("123");
    await selectOption(page, "Year", "Freshman");
    await selectOption(page, "Grade Achieved", "A");
    await selectOption(page, "Reason For Taking", "Major (Required)");
    await selectStarRating(page, "Overall Rating", 4);
    await selectStarRating(page, "Recognizes Difficulties", 4);
    await selectStarRating(page, "Presents Clearly", 4);
}

test("NEWPROF: desktop route renders new professor form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-1: desktop route starts on the professor details step", async () => {
        await expect(page.getByRole("heading", { name: "Add a Professor" })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Add professor steps" })).toBeVisible();
        await expect(
            page.getByRole("navigation", { name: "Add professor steps" }).getByText("Professor Details"),
        ).toBeVisible();
        await expect(page.getByRole("group", { name: "Professor details" })).toBeVisible();
        await expect(page.getByLabel("First Name")).toBeVisible();
        await expect(page.getByLabel("Last Name")).toBeVisible();
        await expect(page.getByLabel("Department")).toBeVisible();
        await expect(page.getByLabel("Department")).toHaveValue("");
        await page.getByLabel("Department").fill("CSC");
        await expect(page.getByRole("option", { name: "CSC", exact: true })).toBeVisible();
        await expect(page.getByRole("group", { name: "Course details" })).toHaveCount(0);
        await expect(page.getByRole("group", { name: "Ratings" })).toHaveCount(0);
        await expect(page.getByRole("group", { name: "Written review" })).toHaveCount(0);
    });
});

test("NEWPROF: mobile route renders linear submit flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-2: mobile route renders linear form with submit action", async () => {
        await expect(page.getByRole("heading", { name: "Add a Professor" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Professor details" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Course details" })).toBeVisible();
        await expect(page.getByLabel("Course Prefix")).toBeVisible();
        await expect(page.getByLabel("Course Prefix")).toHaveValue("");
        await expect(page.getByRole("combobox", { name: "Year" })).toHaveText("Please select");
        await expect(page.getByRole("checkbox", { name: "Same Department" })).toHaveCount(0);
        const ratings = page.getByRole("group", { name: "Ratings" });
        await expect(ratings).toBeVisible();
        await expect(ratings.getByText("Please select")).toHaveCount(3);
        const overallRating = page.getByRole("radiogroup", { name: "Overall Rating" });
        await expect(overallRating).toBeVisible();
        await expect(overallRating.getByRole("radio")).toHaveCount(5);
        await expect(
            overallRating.getByRole("radio", { name: "0 out of 4", exact: true }),
        ).not.toBeChecked();
        await expect(
            overallRating.getByRole("radio", { name: "4 out of 4", exact: true }),
        ).not.toBeChecked();
        await expect(page.getByRole("radiogroup", { name: "Recognizes Difficulties" })).toBeVisible();
        await expect(page.getByRole("radiogroup", { name: "Presents Clearly" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Written review" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Tags" })).toBeVisible();
        await expect(
            page.getByRole("checkbox", {
                name: "I took this class, this review is my opinion, and I license Polyratings to host, moderate, display, and republish it.",
            }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
    });
});

test("NEWPROF: empty required fields are blocked with validation state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-3: submit is blocked and required fields show field-level errors", async () => {
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page).toHaveURL(/\/new-professor$/);
        await expect(page.locator("#professorFirstName-error")).toBeVisible();
        await expect(page.locator("#professorLastName-error")).toBeVisible();
        await expect(page.locator("#professorDepartment-error")).toBeVisible();
        await expect(page.locator("#ratingText-error")).toBeVisible();
        await expect(page.locator("#professorFirstName-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#professorLastName-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#professorDepartment-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#ratingText-error")).toHaveAttribute("role", "alert");
        await expect(page.locator("#professorFirstName-error")).toHaveText(/.+/);
        await expect(page.locator("#professorLastName-error")).toHaveText(/.+/);
        await expect(page.locator("#professorDepartment-error")).toHaveText(/.+/);
        await expect(page.locator("#ratingText-error")).toHaveText(/.+/);
    });
});

test("NEWPROF: successful submission surfaces user feedback", { tag: "@write" }, async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-4: valid submission shows success feedback and exits form route", async () => {
        const uniqueSuffix = Date.now().toString();
        await expect(page.getByRole("group", { name: "Professor details" })).toBeVisible();
        await page.locator('input[name="professorFirstName"]:visible').fill(`E2E${uniqueSuffix}`);
        await page
            .locator('input[name="professorLastName"]:visible')
            .fill(`Professor${uniqueSuffix}`);
        await selectCombobox(page, "Department");
        await fillRequiredReviewFields(page);
        await page
            .locator('textarea[name="ratingText"]:visible')
            .fill("This is an end-to-end rating body with enough characters.");

        await page
            .getByRole("checkbox", {
                name: "I took this class, this review is my opinion, and I license Polyratings to host, moderate, display, and republish it.",
            })
            .check();

        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
            page.getByText(
                /Thank you for adding a professor|automatically added to .*Please reach out/i,
            ),
        ).toBeVisible();
    });
});

test("NEWPROF: desktop stepper confirms review before submit", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-5: Next advances through professor details and review to confirm", async () => {
        const steps = page.getByRole("navigation", { name: "Add professor steps" });
        await expect(steps).toBeVisible();
        await expect(steps.getByText("Professor Details")).toBeVisible();
        await expect(steps.getByText("Write Review")).toBeVisible();
        await expect(steps.getByText("Course Accessibility")).toBeVisible();
        await expect(steps.getByText("Confirm")).toBeVisible();

        await page.locator('input[name="professorFirstName"]:visible').fill("Ada");
        await page.locator('input[name="professorLastName"]:visible').fill("Lovelace");
        await selectCombobox(page, "Department");
        await page.getByRole("button", { name: "Next" }).click();

        await expect(page.getByRole("group", { name: "Course details" })).toBeVisible();
        await expect(page.getByLabel("Course Prefix")).toBeVisible();
        await expect(page.getByLabel("Course Prefix")).toHaveValue("");
        await expect(
            page
                .getByRole("radiogroup", { name: "Overall Rating" })
                .getByRole("radio", { name: "4 out of 4", exact: true }),
        ).not.toBeChecked();
        await fillRequiredReviewFields(page);
        const reviewText = "This is an end-to-end rating body with enough characters.";
        await page.locator('textarea[name="ratingText"]:visible').fill(reviewText);

        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("group", { name: "Tags" })).toBeVisible();

        await page.getByRole("button", { name: "Next" }).click();
        await expect(
            page.getByText("This is how your review will appear on the professor page"),
        ).toBeVisible();
        await expect(page.getByRole("heading", { name: "Lovelace, Ada" })).toBeVisible();
        await expect(page.getByText(reviewText)).toBeVisible();
        await expect(
            page.getByRole("checkbox", {
                name: "I took this class, this review is my opinion, and I license Polyratings to host, moderate, display, and republish it.",
            }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
        await expect(page).toHaveURL(/\/new-professor$/);
    });
});

test("NEWPROF: successful submission with a 4-digit semester course number", { tag: "@write" }, async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/new-professor");

    await test.step("NEWPROF-6: 4-digit course number is accepted after semester conversion", async () => {
        const uniqueSuffix = Date.now().toString();
        await expect(page.getByRole("heading", { name: "Professor" })).toBeVisible();
        await page.locator('input[name="professorFirstName"]:visible').fill(`E2E${uniqueSuffix}`);
        await page
            .locator('input[name="professorLastName"]:visible')
            .fill(`Semester${uniqueSuffix}`);
        await page.locator('input[name="courseNum"]:visible').fill("2231");
        await page
            .locator('textarea[name="ratingText"]:visible')
            .fill("This is an end-to-end rating body with enough characters.");

        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
            page.getByText(
                /Thank you for adding a professor|automatically added to .*Please reach out/i,
            ),
        ).toBeVisible();
    });
});
