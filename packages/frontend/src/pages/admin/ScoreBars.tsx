import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

type ScoreMap = Record<string, number>;

/** Scores below this round to 0% — omit from bars; still listed under Raw. */
const MIN_BAR_SCORE = 0.01;

function isRecord(value: unknown): value is ScoreMap {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize both `category_scores` wrappers and legacy Perspective flat maps. */
export function extractAnalyzedScores(analyzedScores: unknown): ScoreMap {
    if (!isRecord(analyzedScores)) {
        return {};
    }
    if ("category_scores" in analyzedScores && isRecord(analyzedScores.category_scores)) {
        return analyzedScores.category_scores;
    }
    return Object.fromEntries(
        Object.entries(analyzedScores).filter(([, value]) => typeof value === "number"),
    ) as ScoreMap;
}

function humanizeCategory(name: string) {
    return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function severityClass(score: number) {
    if (score >= 0.7) {
        return "bg-destructive";
    }
    if (score >= 0.4) {
        return "bg-accent";
    }
    return "bg-muted-foreground/40";
}

function severityTextClass(score: number) {
    if (score >= 0.7) {
        return "text-destructive";
    }
    if (score >= 0.4) {
        return "text-foreground";
    }
    return "text-muted-foreground";
}

function formatRawScore(score: number) {
    if (score === 0) {
        return "0";
    }
    // Keep meaningful precision for tiny Perspective values without scientific notation clutter.
    if (score < 0.01) {
        return score.toFixed(4).replace(/\.?0+$/, "") || "0";
    }
    return String(Number(score.toPrecision(4)));
}

export function ScoreBars({
    analyzedScores,
    maxVisible = 5,
    className,
}: {
    analyzedScores: unknown;
    maxVisible?: number;
    className?: string;
}) {
    const scores = extractAnalyzedScores(analyzedScores);
    const entries = Object.entries(scores)
        .filter(([, score]) => typeof score === "number" && !Number.isNaN(score))
        .map(([name, score]) => [name, Math.min(1, Math.max(0, score))] as const)
        .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        return <span className="text-sm text-muted-foreground">No scores</span>;
    }

    const barEntries = entries.filter(([, score]) => score >= MIN_BAR_SCORE).slice(0, maxVisible);

    return (
        <div className={cn("flex min-w-[11rem] max-w-xs flex-col gap-2", className)}>
            {barEntries.map(([name, score]) => {
                const percent = Math.round(score * 100);
                return (
                    <div key={name} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-foreground">
                                {humanizeCategory(name)}
                            </span>
                            <span
                                className={cn(
                                    "shrink-0 tabular-nums font-medium",
                                    severityTextClass(score),
                                )}
                            >
                                {percent}%
                            </span>
                        </div>
                        <Progress
                            value={percent}
                            className="h-1.5"
                            indicatorClassName={severityClass(score)}
                            aria-label={`${humanizeCategory(name)} ${percent} percent`}
                        />
                    </div>
                );
            })}
            <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground">
                    Raw scores
                </summary>
                <ul className="mt-1.5 space-y-0.5 pl-0.5">
                    {entries.map(([name, score]) => (
                        <li key={name} className="flex justify-between gap-3 tabular-nums">
                            <span className="truncate">{humanizeCategory(name)}</span>
                            <span className="shrink-0 text-foreground/80">
                                {formatRawScore(score)}
                            </span>
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
}
