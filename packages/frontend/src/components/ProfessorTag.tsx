import { TagIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utils";

export type ProfessorTagProps = {
    tagName: string;
};

export function ProfessorTag({ tagName }: ProfessorTagProps) {
    return (
        <div
            className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border border-brand/20",
                "bg-cal-poly-light-green px-3 text-sm font-medium text-brand",
            )}
        >
            <TagIcon className="size-4" />
            <span>{tagName}</span>
        </div>
    );
}
