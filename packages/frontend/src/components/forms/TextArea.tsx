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
        <div className={`flex flex-col ${error ? "text-red-500" : "text-inherit"} ${wrapperClassName}`}>
            <label className="whitespace-nowrap text-xs" htmlFor={name}>
                {label}
            </label>
            <textarea
                id={name}
                ref={ref}
                name={name}
                className={`h-48 w-full rounded border-[1px] border-[#c3cdd5] bg-[#f2f5f8] p-2 text-black active:bg-[#f2feff] ${className}`}
                {...rest}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
