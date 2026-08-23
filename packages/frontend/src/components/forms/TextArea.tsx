import { forwardRef } from "react";
import { cn } from "@/utils";
import { fieldControlClassName } from "./fieldClassName";

export type TextAreaProps = {
    name: string;
    label: string;
    error?: string;
    className?: string;
    placeholder?: string;
    wrapperClassName?: string;
    "aria-describedby"?: string;
};
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ name, label, error, wrapperClassName = "", className = "", ...rest }, ref) => {
        const errorId = `${name}-error`;
        const describedBy = error
            ? [rest["aria-describedby"], errorId].filter(Boolean).join(" ")
            : rest["aria-describedby"];

        return (
            <div
                className={cn(
                    "flex flex-col",
                    error ? "text-red-500" : "text-inherit",
                    wrapperClassName,
                )}
            >
                <label className="text-xs whitespace-nowrap" htmlFor={name}>
                    {label}
                </label>
                <textarea
                    id={name}
                    ref={ref}
                    name={name}
                    {...rest}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={describedBy}
                    className={fieldControlClassName(
                        error,
                        cn("w-full h-48 rounded-sm text-black p-2", className),
                    )}
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
