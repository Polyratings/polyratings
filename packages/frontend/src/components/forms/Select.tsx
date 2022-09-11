import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<unknown> {
    options: { value: string; label: string }[];
    name: string;
    label: string;
    error?: string;
    wrapperClassName?: string;
}

// TODO: Not opening on enter

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, name, label, error, wrapperClassName = "", ...rest }, ref) => (
        <div
            className={`w-[10.5rem] flex flex-col ${
                error ? "text-red-500" : "text-inherit"
            } ${wrapperClassName}`}
        >
            <label className="text-xs whitespace-nowrap" htmlFor={name}>
                {label}
            </label>
            <div className="relative text-[#465967]">
                <select
                    className={`w-full py-2 pl-4 pr-10 rounded  ${
                        rest.disabled ? "cursor-not-allowed" : "cursor-pointer"
                    } appearance-none border-[1px] ${
                        error ? "border-red-500 bg-red-50" : "border-[#c3cdd5] bg-[#f2f5f8]"
                    } active:bg-[#f2feff]`}
                    id={name}
                    name={name}
                    ref={ref}
                    {...rest}
                >
                    {options.map(({ label, value }) => (
                        <option value={value}>{label}</option>
                    ))}
                </select>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-none"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
