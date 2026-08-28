import { forwardRef } from "react";

import { cn } from "@/utils";

const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
    ({ className, ...props }, ref) => (
        <textarea
            data-slot="textarea"
            className={cn(
                "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-card px-4 py-2 text-base transition-colors outline-hidden placeholder:text-muted-foreground focus-visible:border-brand focus-visible:bg-field-active focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-red-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-secondary dark:disabled:bg-surface-dark dark:aria-invalid:border-destructive/50 dark:aria-invalid:bg-destructive/15 dark:aria-invalid:ring-destructive/40",
                className,
            )}
            ref={ref}
            {...props}
        />
    ),
);
Textarea.displayName = "Textarea";

export { Textarea };
