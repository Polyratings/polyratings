/* eslint-disable react/button-has-type */
import { forwardRef } from "react";

export interface ButtonProps extends React.ComponentProps<"button"> {
    variant?: "primary" | "secondary" | "tertiary";
}

const variantMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-cal-poly-green text-white",
    secondary: "bg-[#f2f5f8] border-cal-poly-green border-[2px] text-cal-poly-green",
    tertiary: "bg-cal-poly-gold text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { variant = "primary", className = "", children, type = "submit", disabled, ...rest },
        ref,
    ) => (
        <button
            className={`px-5 py-2 shadow rounded-md font-medium ${variantMap[variant]} ${
                disabled === true ? "bg-gray-600" : ""
            } ${className}`}
            ref={ref}
            type={type}
            disabled={disabled}
            {...rest}
        >
            {children}
        </button>
    ),
);
