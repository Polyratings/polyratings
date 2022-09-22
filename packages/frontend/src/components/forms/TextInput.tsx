import { forwardRef, HTMLAttributes } from "react";

export interface TextInputProps extends Partial<HTMLAttributes<HTMLInputElement>> {
    name: string;
    label: string;
    error?: string;
    type?: "text" | "number" | "password";
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
    ) => (
        <div
            className={`flex flex-col w-[10.5rem] ${
                error ? "text-red-500" : "text-inherit"
            } ${wrapperClassName}`}
        >
            <label className="text-xs whitespace-nowrap" htmlFor={name}>
                {label}
            </label>
            <input
                className={`py-2 pl-4 pr-10 rounded  cursor-pointer appearance-none border-[1px] ${
                    error ? "border-red-500 bg-red-50" : "border-[#c3cdd5] bg-[#f2f5f8]"
                } active:bg-[#f2feff] ${className}`}
                id={name}
                ref={ref}
                type={type}
                name={name}
                {...rest}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
