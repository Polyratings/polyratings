import { TagIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utils";

export type ProfessorTagProps = {
    tagName: string;
    size?: "default" | "sm";
    className?: string;
};

export function ProfessorTag({ tagName, size = "default", className }: ProfessorTagProps) {
    const compact = size === "sm";

    return (
        <div
            className={cn(
                "inline-flex max-w-full items-center rounded-md border border-brand/35",
                "bg-cal-poly-light-green font-medium whitespace-nowrap text-brand",
                compact ? "h-7 gap-1 px-2 text-xs" : "h-8 gap-1.5 px-3 text-sm",
                className,
            )}
        >
            <TagIcon className={cn("shrink-0", compact ? "size-3.5" : "size-4")} />
            <span className="truncate">{tagName}</span>
        </div>
    );
}
