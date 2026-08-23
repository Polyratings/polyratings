import { forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utils";
import { fieldControlClassName } from "./fieldClassName";

export interface SelectProps extends React.ComponentProps<"select"> {
    options: { value: string; label: string }[];
    label: string;
    error?: string;
    wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, name, label, error, wrapperClassName = "", ...rest }, ref) => (
        <div
            className={cn(
                "w-42 flex flex-col",
                error ? "text-red-500" : "text-inherit",
                wrapperClassName,
            )}
        >
            <label className="text-xs whitespace-nowrap" htmlFor={name}>
                {label}
            </label>
            <div className="relative text-[#465967]">
                <select
                    className={fieldControlClassName(
                        error,
                        cn(
                            "w-full py-2 pl-4 pr-10 rounded appearance-none",
                            rest.disabled ? "cursor-not-allowed" : "cursor-pointer",
                        ),
                    )}
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
                    className="w-6 h-6 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none"
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    ),
);
