import { forwardRef, useId, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/utils";

const DEFAULT_MAX_SCORE = 4;

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}

export interface StarRatingInputProps extends Omit<
    React.ComponentProps<"input">,
    "type" | "value" | "defaultValue" | "children"
> {
    label: string;
    error?: string;
    wrapperClassName?: string;
    maxScore?: number;
    placeholder?: string;
    value?: string;
    defaultValue?: string;
}

export const StarRatingInput = forwardRef<HTMLInputElement, StarRatingInputProps>(
    (
        {
            label,
            name,
            error,
            wrapperClassName = "",
            className,
            id,
            maxScore = DEFAULT_MAX_SCORE,
            placeholder = "Please select",
            value,
            defaultValue,
            onChange,
            onBlur,
            disabled,
            required,
            "aria-describedby": ariaDescribedBy,
            "aria-invalid": ariaInvalid,
        },
        ref,
    ) => {
        const fallbackId = useId();
        const groupId = id ?? name ?? fallbackId;
        const labelId = `${groupId}-label`;
        const errorId = name ? `${name}-error` : undefined;
        const describedBy = error
            ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
            : ariaDescribedBy;
        const isControlled = value !== undefined;
        const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
        const [previewScore, setPreviewScore] = useState<number | null>(null);
        const selectedValue = isControlled ? value : uncontrolledValue;
        const selectedScore = selectedValue === "" ? null : Number(selectedValue);
        const shownScore = previewScore ?? selectedScore;
        const hiddenInputRef = useRef<HTMLInputElement | null>(null);

        const emitChange = (nextValue: string) => {
            if (!isControlled) {
                setUncontrolledValue(nextValue);
            }
            if (hiddenInputRef.current) {
                hiddenInputRef.current.value = nextValue;
            }
            onChange?.({
                target: { name, value: nextValue },
                currentTarget: { name, value: nextValue },
            } as ChangeEvent<HTMLInputElement>);
        };

        return (
            <div
                className={cn(
                    "w-42 flex flex-col",
                    error ? "text-red-500" : "text-inherit",
                    wrapperClassName,
                )}
            >
                <span className="text-sm whitespace-nowrap" id={labelId}>
                    {label}
                </span>
                <input
                    ref={(element) => {
                        hiddenInputRef.current = element;
                        assignRef(ref, element);
                    }}
                    type="hidden"
                    name={name}
                    value={selectedValue}
                    readOnly
                />
                <div
                    className="flex h-12 items-center gap-2 sm:h-10"
                    onMouseLeave={() => setPreviewScore(null)}
                >
                    <div
                        aria-describedby={describedBy}
                        aria-invalid={error ? true : ariaInvalid}
                        aria-labelledby={labelId}
                        aria-required={required}
                        className={cn("flex items-center", className)}
                        id={groupId}
                        role="radiogroup"
                        onBlur={(event) =>
                            onBlur?.(event as unknown as FocusEvent<HTMLInputElement>)
                        }
                    >
                        {Array.from({ length: maxScore + 1 }, (_, score) => (
                            <label
                                key={score}
                                className={cn(
                                    "relative inline-flex size-10 shrink-0 items-center justify-center sm:size-7",
                                    disabled ? "cursor-not-allowed" : "cursor-pointer",
                                    score === 0 && "mr-1",
                                )}
                                htmlFor={`${groupId}-${score}`}
                                onMouseEnter={() => setPreviewScore(score)}
                            >
                                <input
                                    aria-label={`${score} out of ${maxScore}`}
                                    checked={selectedScore === score}
                                    className="peer absolute inset-0 m-0 size-full appearance-none opacity-0"
                                    disabled={disabled}
                                    id={`${groupId}-${score}`}
                                    name={name}
                                    type="radio"
                                    value={score}
                                    onChange={() => emitChange(`${score}`)}
                                />
                                {score === 0 ? (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "flex h-9 w-10 items-center justify-center rounded-md border text-sm font-semibold sm:h-6 sm:w-7 sm:text-xs",
                                            "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                                            shownScore === 0
                                                ? "border-accent bg-accent/20 text-foreground"
                                                : "border-border text-muted-foreground",
                                        )}
                                    >
                                        0
                                    </span>
                                ) : (
                                    <Star
                                        aria-hidden
                                        className={cn(
                                            "size-9 rounded-sm sm:size-6",
                                            "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                                            shownScore !== null && score <= shownScore
                                                ? "fill-accent text-accent"
                                                : "text-gray-300 dark:text-seal-gray",
                                        )}
                                        strokeWidth={1.5}
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground sm:text-xs">
                        {shownScore === null ? placeholder : `${shownScore}/${maxScore}`}
                    </span>
                </div>
                {error && (
                    <p className="text-sm text-red-500" id={errorId} role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);
StarRatingInput.displayName = "StarRatingInput";
