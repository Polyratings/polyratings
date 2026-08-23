import { cn } from "@/utils";

export function fieldControlClassName(error?: string | boolean, className?: string) {
    return cn(
        "border",
        error ? "border-red-500 bg-red-50" : "border-field-border bg-field",
        "active:bg-field-active",
        className,
    );
}
