import { forwardRef } from "react";

import { cn } from "@/utils";

const Input = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "h-10 w-full min-w-0 rounded-md border border-input bg-card px-4 py-2 text-base transition-colors outline-hidden file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-brand focus-visible:bg-field-active focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-red-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-secondary dark:disabled:bg-surface-dark dark:aria-invalid:border-destructive/50 dark:aria-invalid:bg-destructive/15 dark:aria-invalid:ring-destructive/40",
                className,
            )}
            ref={ref}
            {...props}
        />
    ),
);
Input.displayName = "Input";

export { Input };
