import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

export interface TextInputProps extends React.ComponentProps<"input"> {
    label: string;
    error?: string;
    wrapperClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    (
        {
            name,
            label,
            error,
            type,
            wrapperClassName = "",
            className = "",
            ...rest
        }: TextInputProps,
        ref,
    ) => {
        const errorId = name ? `${name}-error` : undefined;
        const existingDescribedBy = rest["aria-describedby"];
        const describedBy =
            error && errorId
                ? [existingDescribedBy, errorId].filter(Boolean).join(" ")
                : existingDescribedBy;

        return (
            <div
                className={cn(
                    "flex flex-col w-42",
                    error ? "text-red-500" : "text-inherit",
                    wrapperClassName,
                )}
            >
                <label className="text-sm whitespace-nowrap" htmlFor={name}>
                    {label}
                </label>
                <Input
                    className={cn("cursor-text", className)}
                    id={name}
                    ref={ref}
                    type={type}
                    name={name}
                    {...rest}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={describedBy}
                />
                {error && (
                    <p id={errorId} role="alert" className="text-sm text-red-500">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);
TextInput.displayName = "TextInput";
