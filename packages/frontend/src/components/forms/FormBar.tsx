import { ReactElement, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import ClipLoader from "react-spinners/ClipLoader";
import { Button } from "./Button";

export type FormStep = "first" | "second";

export type FormBarProps = {
    isLoading: boolean;
    // Fine to use any since trigger does not use the type param
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerValidation: UseFormReturn<any>["trigger"];
    firstStep: () => ReactElement;
    secondStep: () => ReactElement;
};

export function FormBar({ isLoading, triggerValidation, firstStep, secondStep }: FormBarProps) {
    const [formStep, setFormStep] = useState<FormStep>("first");

    return (
        <>
            <div className="w-[24rem] my-4 m-auto">
                <div className="flex mb-1">
                    <div
                        className={`w-1/2 text-center text-sm ${
                            formStep === "first" ? "font-semibold" : "font-normal"
                        }`}
                    >
                        Write Review
                    </div>
                    <div
                        className={`w-1/2 text-center text-sm ${
                            formStep === "second" ? "font-semibold" : "font-normal"
                        }`}
                    >
                        Course Accessibility
                    </div>
                </div>
                <div className="h-1 rounded-sm bg-gray-200 relative transition-all">
                    <div
                        className={`absolute w-1/2 h-1 rounded bg-cal-poly-green ${
                            formStep === "first" ? "left-0" : "left-1/2"
                        }`}
                    />
                </div>
            </div>

            {formStep === "first" && firstStep()}
            {formStep === "second" && secondStep()}

            <div
                className={`flex justify-center gap-6 mt-2 ${
                    isLoading || formStep !== "first" ? "hidden" : "block"
                } `}
            >
                <Button variant="secondary" type="submit">
                    Skip Course Accessibility
                </Button>
                <Button
                    type="button"
                    onClick={async () =>
                        (await triggerValidation(undefined, { shouldFocus: true })) &&
                        setFormStep("second")
                    }
                >
                    Next
                </Button>
            </div>

            <div
                className={`flex justify-center gap-6 mt-2 ${
                    isLoading || formStep !== "second" ? "hidden" : "block"
                } `}
            >
                <Button type="button" variant="secondary" onClick={() => setFormStep("first")}>
                    Back
                </Button>
                <Button type="submit">Submit</Button>
            </div>

            <div className="flex justify-center">
                {/* Exact size for no layer shift */}
                <ClipLoader color="#1F4715" loading={isLoading} size={34} />
            </div>
        </>
    );
}
