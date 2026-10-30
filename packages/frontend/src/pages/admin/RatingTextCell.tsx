import { cn } from "@/utils";

export function RatingTextCell({
    text,
    author,
    className,
}: {
    text: string;
    /** Rating author identifier (not the person who filed a report). */
    author?: string | null;
    className?: string;
}) {
    const trimmed = text?.trim() ?? "";
    const byline = author?.trim();

    if (!trimmed) {
        return (
            <div className={cn("max-w-md whitespace-normal", className)}>
                {byline ? <p className="text-xs text-muted-foreground">by {byline}</p> : null}
                <span className="text-muted-foreground">—</span>
            </div>
        );
    }

    return (
        <div className={cn("max-w-md whitespace-normal", className)}>
            {byline ? <p className="mb-1 text-xs text-muted-foreground">by {byline}</p> : null}
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{trimmed}</p>
        </div>
    );
}
