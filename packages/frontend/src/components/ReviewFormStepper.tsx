import { type ReactNode, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils";
import { Button } from "./forms";
import { Stepper } from "./Stepper";

export const REVIEW_FORM_STEPS = [
    { id: "review", label: "Write Review" },
    { id: "accessibility", label: "Course Accessibility" },
    { id: "confirm", label: "Confirm" },
] as const;

export const ADD_PROFESSOR_FORM_STEPS = [
    { id: "details", label: "Professor Details" },
    ...REVIEW_FORM_STEPS,
] as const;

export type ReviewFormStep = {
    id: string;
    label: string;
    content: ReactNode;
    fields?: string[];
};

export type ReviewFormStepperProps = {
    isLoading: boolean;
    steps: readonly ReviewFormStep[];
    "aria-label"?: string;
    className?: string;
};

export function ReviewFormStepper({
    isLoading,
    steps,
    "aria-label": ariaLabel = "Review steps",
    className,
}: ReviewFormStepperProps) {
    const { trigger } = useFormContext();
    const [step, setStep] = useState(0);
    const confirmStepIndex = steps.length - 1;

    const goToNext = async () => {
        const fields = steps[step]?.fields;
        const isValid = fields?.length ? await trigger(fields, { shouldFocus: true }) : true;
        if (isValid) {
            setStep((currentStep) => currentStep + 1);
        }
    };

    return (
        <>
            <input type="hidden" name="reviewFormStep" value={String(step)} readOnly />
            <input
                type="hidden"
                name="reviewFormConfirmStep"
                value={String(confirmStepIndex)}
                readOnly
            />
            <Stepper
                aria-label={ariaLabel}
                className={cn("mx-auto my-4", className)}
                steps={steps}
                currentStep={step}
                onStepSelect={(index) => {
                    if (index < step) {
                        setStep(index);
                    }
                }}
            />

            {steps.map((stepConfig, index) => (
                <div key={stepConfig.id} className={index === step ? undefined : "hidden"}>
                    {stepConfig.content}
                </div>
            ))}

            <div
                className={cn(
                    "mt-4 flex flex-wrap justify-center gap-4",
                    isLoading ? "hidden" : undefined,
                )}
            >
                {step > 0 && (
                    <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                        Back
                    </Button>
                )}
                {step < confirmStepIndex && (
                    <Button
                        type="button"
                        onClick={() => {
                            goToNext().catch(() => undefined);
                        }}
                    >
                        Next
                    </Button>
                )}
                {step === confirmStepIndex && <Button type="submit">Submit</Button>}
            </div>

            <div className="flex justify-center">
                {isLoading ? <Spinner className="size-[34px] text-brand" /> : null}
            </div>
        </>
    );
}

export function isReviewFormOnConfirmStep(form: HTMLFormElement) {
    const stepField = form.elements.namedItem("reviewFormStep");
    const confirmField = form.elements.namedItem("reviewFormConfirmStep");
    return (
        stepField instanceof HTMLInputElement &&
        confirmField instanceof HTMLInputElement &&
        stepField.value === confirmField.value
    );
}
