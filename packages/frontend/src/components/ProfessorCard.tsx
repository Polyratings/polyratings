import { Link } from "react-router";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Rating, FilledStar } from "./Rating";
import { cn } from "@/utils";

interface ProfessorCardProps {
    professor: inferProcedureOutput<AppRouter["professors"]["all"]>[0] | null;
}

export const PROFESSOR_CARD_HEIGHT_REM = 7;

export function ProfessorCard({ professor }: ProfessorCardProps) {
    return (
        <Link
            to={`/professor/${professor?.id}`}
            className="block rounded-lg focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            <div
                className={cn(
                    "flex h-24 w-full items-center gap-3 rounded-lg border border-input bg-card px-4 text-foreground shadow-sm sm:gap-4 sm:px-5",
                    "transition-[border-color,box-shadow,transform] hover:border-brand hover:shadow-md",
                )}
            >
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-2xl font-semibold tracking-tight">
                        {professor?.lastName}, {professor?.firstName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {professor?.department}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-3">
                            <div className="hidden items-center gap-1 sm:flex">
                                <Rating value={professor?.overallRating} size="1.1rem" gap="1px" />
                            </div>
                            <FilledStar className="sm:hidden" size="1.35rem" />
                            <span className="text-2xl font-semibold tabular-nums">
                                {professor?.overallRating.toFixed(2)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {professor?.numEvals}{" "}
                            {professor?.numEvals === 1 ? "evaluation" : "evaluations"}
                        </p>
                    </div>
                    <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
                </div>
            </div>
        </Link>
    );
}
