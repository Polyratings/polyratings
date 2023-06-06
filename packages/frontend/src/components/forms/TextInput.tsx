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
    ) => (
        <div
            className={`flex w-[10.5rem] flex-col ${
                error ? "text-red-500" : "text-inherit"
            } ${wrapperClassName}`}
        >
            <label className="whitespace-nowrap text-xs" htmlFor={name}>
                {label}
            </label>
            <input
                className={`cursor-pointer appearance-none rounded border-[1px]  py-2 pl-4 pr-10 ${
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
