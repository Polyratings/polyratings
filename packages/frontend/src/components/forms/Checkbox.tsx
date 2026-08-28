import { forwardRef, type ChangeEvent, type FocusEvent } from "react";
import { Checkbox as UiCheckbox } from "@/components/ui/checkbox";
import { cn } from "@/utils";

export interface CheckboxProps extends React.ComponentProps<"input"> {
    label: string;
    error?: string;
    wrapperClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            label,
            name,
            className,
            wrapperClassName,
            checked,
            defaultChecked,
            disabled,
            required,
            value,
            onChange,
            onBlur,
            id,
            error,
            "aria-describedby": ariaDescribedBy,
            "aria-invalid": ariaInvalid,
        },
        ref,
    ) => {
        const checkboxId = id ?? name;
        const errorId = name ? `${name}-error` : undefined;
        const describedBy =
            error && errorId
                ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
                : ariaDescribedBy;
        const emitChange = (nextValue: boolean | "indeterminate") => {
            const isChecked = nextValue === true;
            onChange?.({
                target: { name, checked: isChecked, value: isChecked },
                currentTarget: { name, checked: isChecked, value: isChecked },
            } as unknown as ChangeEvent<HTMLInputElement>);
        };

        return (
            <div
                className={cn("flex items-center w-42", error && "text-red-500", wrapperClassName)}
            >
                <UiCheckbox
                    aria-describedby={describedBy}
                    aria-invalid={error ? true : ariaInvalid}
                    checked={checked}
                    className={cn("mt-0.5", className)}
                    defaultChecked={defaultChecked}
                    disabled={disabled}
                    id={checkboxId}
                    name={name}
                    ref={ref as unknown as React.Ref<HTMLButtonElement>}
                    required={required}
                    value={value}
                    onBlur={(event) => onBlur?.(event as unknown as FocusEvent<HTMLInputElement>)}
                    onCheckedChange={emitChange}
                />
                <div className="ml-2">
                    <label
                        htmlFor={checkboxId}
                        className="cursor-pointer py-2 text-sm leading-5 md:py-0"
                    >
                        {label}
                    </label>
                    {error && errorId ? (
                        <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
                            {error}
                        </p>
                    ) : null}
                </div>
            </div>
        );
    },
);
Checkbox.displayName = "Checkbox";
