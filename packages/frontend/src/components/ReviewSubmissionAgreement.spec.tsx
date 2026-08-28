import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
    REVIEW_SUBMISSION_AGREEMENT_LABEL,
    ReviewSubmissionAgreement,
} from "./ReviewSubmissionAgreement";

function Harness() {
    const form = useForm({
        defaultValues: { acceptedSubmissionTerms: false },
    });

    return (
        <FormProvider {...form}>
            <form>
                <ReviewSubmissionAgreement />
            </form>
        </FormProvider>
    );
}

describe("ReviewSubmissionAgreement", () => {
    it("has no axe violations", async () => {
        const { container } = render(<Harness />);
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("renders the agreement checkbox", () => {
        render(<Harness />);
        expect(
            screen.getByRole("checkbox", { name: REVIEW_SUBMISSION_AGREEMENT_LABEL }),
        ).toBeTruthy();
    });
});
