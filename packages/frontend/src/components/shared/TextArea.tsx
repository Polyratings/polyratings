import { forwardRef } from "react";

export type TextAreaProps = {
    name: string;
    label: string;
    error?: string;
    className?: string;
    placeholder?: string;
    wrapperClassName?: string;
};
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ name, label, error, wrapperClassName = "", className = "", ...rest }, ref) => (
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
                className={`w-full h-48 rounded-sm text-black p-2 border-[#c3cdd5] bg-[#f2f5f8] active:bg-[#f2feff] border ${className}`}
                {...rest}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
