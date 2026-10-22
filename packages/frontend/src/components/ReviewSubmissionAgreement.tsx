import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";
import { formError, formErrors } from "@/utils";
import { Checkbox } from "./forms";

export const REVIEW_SUBMISSION_AGREEMENT_FIELD = "acceptedSubmissionTerms";

export const REVIEW_SUBMISSION_AGREEMENT_LABEL =
    "I took this class, this is my opinion, and I license Polyratings to host, moderate, display, and republish it.";

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
                    // Keep the standard square control; nudge for xs label optical center.
                    className="translate-y-px"
                    error={fieldState.error?.message}
                    label={REVIEW_SUBMISSION_AGREEMENT_LABEL}
                    name={field.name}
                    // text-sm; wrap instead of overflowing mid-widths
                    wrapperClassName="mt-6 flex w-full max-w-3xl items-center [&_label]:py-0 [&_label]:text-sm [&_label]:leading-snug [&_label]:text-foreground"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.checked)}
                />
            )}
        />
    );
}
