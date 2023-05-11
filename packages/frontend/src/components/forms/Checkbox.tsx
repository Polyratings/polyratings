import { forwardRef } from "react";

export interface CheckboxProps extends React.ComponentProps<"input"> {
    label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, name, ...rest }, ref) => (
        <div className="flex items-center w-[10.5rem]">
            <input
                id={name}
                name={name}
                type="checkbox"
                className="w-4 h-4 text-blue-60 rounded border-[#c3cdd5] bg-[#f2f5f8]"
                ref={ref}
                {...rest}
            />
            <label htmlFor={name} className="ml-2 text-sm">
                {label}
            </label>
        </div>
    ),
);
