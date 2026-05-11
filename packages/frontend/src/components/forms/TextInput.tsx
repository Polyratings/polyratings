import { forwardRef } from "react";

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
                className={`flex flex-col w-42 ${
                    error ? "text-red-500" : "text-inherit"
                } ${wrapperClassName}`}
            >
                <label className="text-xs whitespace-nowrap" htmlFor={name}>
                    {label}
                </label>
                <input
                    className={`py-2 pl-4 pr-10 rounded  cursor-pointer appearance-none border ${
                        error ? "border-red-500 bg-red-50" : "border-[#c3cdd5] bg-[#f2f5f8]"
                    } active:bg-[#f2feff] ${className}`}
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
