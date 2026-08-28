import { forwardRef, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import {
    Select as UiSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";

// Radix Select reserves "" for an empty selection, so option values of ""
// (for example "Other") must be mapped to a sentinel to keep the label visible.
const EMPTY_SELECT_VALUE = "__empty__";

function toUiValue(value: string | undefined) {
    return value === "" ? EMPTY_SELECT_VALUE : value;
}

function fromUiValue(value: string) {
    return value === EMPTY_SELECT_VALUE ? "" : value;
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}

export interface SelectProps extends Omit<React.ComponentProps<"select">, "children"> {
    options: { value: string; label: string }[];
    label: string;
    error?: string;
    wrapperClassName?: string;
    hideLabel?: boolean;
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            options,
            name,
            label,
            error,
            wrapperClassName = "",
            hideLabel = false,
            placeholder = "Please select",
            className,
            id,
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
        const selectId = id ?? name;
        const errorId = name ? `${name}-error` : undefined;
        const describedBy = error
            ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
            : ariaDescribedBy;
        const fallbackValue = defaultValue?.toString() ?? "";
        const isControlled = value !== undefined;
        const [uncontrolledValue, setUncontrolledValue] = useState(fallbackValue);
        const selectedValue = isControlled ? value.toString() : uncontrolledValue;
        const hasEmptyOption = options.some((option) => option.value === "");
        const uiValue =
            selectedValue === "" && !hasEmptyOption ? undefined : toUiValue(selectedValue);
        const nativeSelectRef = useRef<HTMLSelectElement | null>(null);

        const emitChange = (nextValue: string) => {
            if (!isControlled) {
                setUncontrolledValue(nextValue);
            }
            if (nativeSelectRef.current) {
                nativeSelectRef.current.value = nextValue;
            }
            onChange?.({
                target: { name, value: nextValue },
                currentTarget: { name, value: nextValue },
            } as ChangeEvent<HTMLSelectElement>);
        };

        return (
            <div
                className={cn(
                    "w-42 flex flex-col",
                    error ? "text-red-500" : "text-inherit",
                    wrapperClassName,
                )}
            >
                <label
                    className={cn("text-sm whitespace-nowrap", hideLabel && "sr-only")}
                    htmlFor={selectId}
                >
                    {label}
                </label>
                <select
                    ref={(element) => {
                        nativeSelectRef.current = element;
                        assignRef(ref, element);
                    }}
                    aria-hidden="true"
                    className="hidden"
                    disabled={disabled}
                    name={name}
                    required={required}
                    tabIndex={-1}
                    value={selectedValue}
                    onBlur={onBlur}
                    onChange={(event) => {
                        emitChange(fromUiValue(event.target.value));
                    }}
                >
                    {selectedValue === "" && !hasEmptyOption ? (
                        <option value="">{label}</option>
                    ) : null}
                    {options.map(({ label: optionLabel, value: optionValue }) => (
                        <option
                            key={`${optionLabel}-${optionValue || "empty"}`}
                            value={optionValue}
                        >
                            {optionLabel}
                        </option>
                    ))}
                </select>
                <UiSelect
                    disabled={disabled}
                    required={required}
                    value={uiValue}
                    onValueChange={(nextValue) => emitChange(fromUiValue(nextValue))}
                >
                    <SelectTrigger
                        aria-describedby={describedBy}
                        aria-invalid={error ? true : ariaInvalid}
                        className={cn("h-11 w-full md:h-10", className)}
                        id={selectId}
                        onBlur={(event) =>
                            onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>)
                        }
                    >
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        {options.map(({ label: optionLabel, value: optionValue }) => (
                            <SelectItem
                                key={`${optionLabel}-${optionValue || "empty"}`}
                                value={toUiValue(optionValue) ?? EMPTY_SELECT_VALUE}
                            >
                                {optionLabel}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </UiSelect>
                {error && (
                    <p id={errorId} role="alert" className="text-sm text-red-500">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);
Select.displayName = "Select";
