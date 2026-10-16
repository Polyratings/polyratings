import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";
import { formError, formErrors } from "@/utils";
import { Checkbox } from "./forms";

export const REVIEW_SUBMISSION_AGREEMENT_FIELD = "acceptedSubmissionTerms";

export const REVIEW_SUBMISSION_AGREEMENT_LABEL =
    "I took this class, this review is my opinion, and I license Polyratings to host, moderate, display, and republish it.";

export const reviewSubmissionAgreementParser = z
    .boolean()
    .refine((accepted) => accepted, formError(formErrors.reviewLicense));

export function ReviewSubmissionAgreement() {
    const { control } = useFormContext();

    return (
        <Controller
            control={control}
            name={REVIEW_SUBMISSION_AGREEMENT_FIELD}
            render={({ field, fieldState }) => (
                <Checkbox
                    checked={Boolean(field.value)}
                    error={fieldState.error?.message}
                    label={REVIEW_SUBMISSION_AGREEMENT_LABEL}
                    name={field.name}
                    wrapperClassName="mt-6 w-full max-w-xl items-start rounded-lg border border-border bg-muted/40 p-4"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.checked)}
                />
            )}
        />
    );
}
