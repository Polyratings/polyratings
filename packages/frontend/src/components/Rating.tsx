import { Star } from "lucide-react";
import { cn } from "@/utils";

export interface RatingProps {
    value?: number;
    max?: number;
    size?: string;
    gap?: string;
    className?: string;
}

export function FilledStar({ size = "1.25rem", className }: { size?: string; className?: string }) {
    return (
        <Star
            aria-hidden
            className={cn("shrink-0 fill-accent text-accent", className)}
            strokeWidth={1.5}
            style={{ width: size, height: size }}
        />
    );
}

export function Rating({
    value = 0,
    max = 4,
    size = "1.1rem",
    gap = "1px",
    className,
}: RatingProps) {
    const clamped = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
    const label = `${clamped.toFixed(2)} out of ${max} stars`;

    return (
        <div
            className={cn("inline-flex items-center", className)}
            style={{ gap }}
            role="img"
            aria-label={label}
        >
            {Array.from({ length: max }, (_, index) => {
                const fill = Math.min(1, Math.max(0, clamped - index));
                return (
                    <span
                        key={`star-${index}`}
                        className="relative inline-flex shrink-0"
                        style={{ width: size, height: size }}
                    >
                        <Star
                            className="size-full text-gray-300 dark:text-seal-gray"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                        {fill > 0 && (
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{ width: `${fill * 100}%` }}
                            >
                                <Star
                                    className="size-full fill-accent text-accent"
                                    style={{ width: size, height: size }}
                                    strokeWidth={1.5}
                                    aria-hidden
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}
