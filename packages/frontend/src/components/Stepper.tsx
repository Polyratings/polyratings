import { Check } from "lucide-react";
import { cn } from "@/utils";

export type StepperStep = {
    id: string;
    label: string;
};

export type StepperProps = {
    steps: readonly StepperStep[];
    currentStep: number;
    onStepSelect?: (index: number) => void;
    "aria-label"?: string;
    className?: string;
};

export function Stepper({
    steps,
    currentStep,
    onStepSelect,
    "aria-label": ariaLabel = "Progress",
    className,
}: StepperProps) {
    return (
        <nav aria-label={ariaLabel} className={cn("w-full", className)}>
            <ol className="flex w-full">
                {steps.map((step, index) => {
                    const status: "complete" | "current" | "upcoming" = (() => {
                        if (index < currentStep) {
                            return "complete";
                        }
                        if (index === currentStep) {
                            return "current";
                        }
                        return "upcoming";
                    })();
                    const isClickable = Boolean(onStepSelect) && status === "complete";
                    const circle = (
                        <span
                            className={cn(
                                "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                                status === "upcoming" &&
                                    "border-2 border-border bg-card text-muted-foreground",
                                status === "current" &&
                                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                                status === "complete" && "bg-primary text-primary-foreground",
                            )}
                        >
                            {status === "complete" ? (
                                <Check className="size-4" aria-hidden="true" />
                            ) : (
                                index + 1
                            )}
                        </span>
                    );
                    const label = (
                        <span
                            className={cn(
                                "mt-2 max-w-28 text-center text-xs leading-tight sm:max-w-none sm:text-sm",
                                status === "current"
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-muted-foreground",
                            )}
                        >
                            {step.label}
                        </span>
                    );

                    return (
                        <li
                            key={step.id}
                            className="relative flex flex-1 flex-col items-center"
                            aria-current={status === "current" ? "step" : undefined}
                        >
                            {index !== 0 && (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2",
                                        index <= currentStep ? "bg-primary" : "bg-border",
                                    )}
                                />
                            )}
                            {index !== steps.length - 1 && (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2",
                                        index < currentStep ? "bg-primary" : "bg-border",
                                    )}
                                />
                            )}
                            {isClickable ? (
                                <button
                                    type="button"
                                    className={cn(
                                        "relative z-10 flex flex-col items-center rounded-md",
                                        "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                                    )}
                                    onClick={() => onStepSelect?.(index)}
                                >
                                    {circle}
                                    {label}
                                </button>
                            ) : (
                                <div className="relative z-10 flex flex-col items-center">
                                    {circle}
                                    {label}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
