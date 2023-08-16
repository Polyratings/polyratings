import { forwardRef } from "react";

export interface CheckboxProps extends React.ComponentProps<"input"> {
    label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, name, ...rest }, ref) => (
    <div className="flex w-[10.5rem] items-center">
        <input
            id={name}
            name={name}
            type="checkbox"
            className="text-blue-60 h-4 w-4 rounded border-[#c3cdd5] bg-[#f2f5f8]"
            ref={ref}
            {...rest}
        />
        <label htmlFor={name} className="ml-2 text-sm">
            {label}
        </label>
    </div>
));
