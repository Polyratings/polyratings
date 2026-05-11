import { forwardRef } from "react";

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
                className={`flex flex-col ${
                    error ? "text-red-500" : "text-inherit"
                } ${wrapperClassName}`}
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
                    className={`w-full h-48 rounded-sm text-black p-2 border-[#c3cdd5] bg-[#f2f5f8] active:bg-[#f2feff] border ${className}`}
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
