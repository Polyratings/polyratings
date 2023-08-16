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
        <div className={`flex w-[10.5rem] flex-col ${error ? "text-red-500" : "text-inherit"} ${wrapperClassName}`}>
            <label className="whitespace-nowrap text-xs" htmlFor={name}>
                {label}
            </label>
            <div className="relative text-[#465967]">
                <select
                    className={`w-full rounded py-2 pl-4 pr-10  ${
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
                        <option key={label} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon
                    strokeWidth={1.5}
                    className="pointer-events-none absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 transform"
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
