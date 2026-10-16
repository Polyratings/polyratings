import { forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export interface SelectProps extends React.ComponentProps<"select"> {
    options: { value: string; label: string }[];
    label: string;
    error?: string;
    wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, name, label, error, wrapperClassName = "", ...rest }, ref) => (
        <div
            className={`flex w-42 flex-col ${
                error ? "text-red-500" : "text-inherit"
            } ${wrapperClassName}`}
        >
            <label className="text-xs whitespace-nowrap" htmlFor={name}>
                {label}
            </label>
            <div className="relative text-[#465967]">
                <select
                    className={`w-full rounded py-2 pr-10 pl-4 ${
                        rest.disabled ? "cursor-not-allowed" : "cursor-pointer"
                    } appearance-none border ${
                        error ? "border-red-500 bg-red-50" : "border-[#c3cdd5] bg-[#f2f5f8]"
                    } active:bg-[#f2feff]`}
                    id={name}
                    name={name}
                    ref={ref}
                    {...rest}
                >
                    {options.map(({ label, value }) => (
                        <option key={label} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 right-3 h-6 w-6 -translate-y-1/2 transform"
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
