import { useMemo, useState } from "react";
import { PENDING_RATING_STATUSES } from "@backend/utils/const";
import { ExternalLink } from "lucide-react";
import { Button, InlineQueryState, Select } from "@/components";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useDbValues } from "@/hooks/useDbValues";
import { RatingTextCell } from "@/pages/admin/RatingTextCell";
import { ScheduleMatchBadge, scheduleMatchLabel } from "@/pages/admin/ScheduleMatchBadge";
import { ScoreBars, extractAnalyzedScores } from "@/pages/admin/ScoreBars";
import {
    AdminSearchInput,
    AdminSection,
    AdminTableEmptyRow,
    AdminTablePagination,
    emptyStateMessage,
    filterBarClassName,
    getAdminTablePage,
    tableSurfaceClassName,
} from "@/pages/admin/shared";
import { cn } from "@/utils";

function statusBadgeVariant(status: string) {
    if (status === "Successful") {
        return "default" as const;
    }
    if (status === "Failed") {
        return "destructive" as const;
    }
    return "outline" as const;
}

export function ProcessedRatings() {
    const { data: processedRatings, isPending, error } = useDbValues("rating-log");
    type PendingRating = NonNullable<typeof processedRatings>[0];
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const sortedProcessedRatings = useMemo(
        () =>
            [...(processedRatings ?? [])].sort(
                (ratingA, ratingB) => Date.parse(ratingB.postDate) - Date.parse(ratingA.postDate),
            ),
        [processedRatings],
    );

    const filteredRatings = useMemo(() => {
        const query = search.trim().toLowerCase();
        return sortedProcessedRatings.filter((row) => {
            if (status && row.status !== status) {
                return false;
            }
            if (!query) {
                return true;
            }
            const ratingText = (row.rating ?? "").toLowerCase();
            const course = `${row.department} ${row.courseNum}`.toLowerCase();
            const scores = Object.keys(extractAnalyzedScores(row.analyzedScores))
                .join(" ")
                .toLowerCase();
            const scheduleMatch = row.scheduleMatch
                ? `${row.scheduleMatch.status} ${scheduleMatchLabel(row.scheduleMatch.status)} ${row.scheduleMatch.matchedCourseKeys.join(" ")}`.toLowerCase()
                : "";
            return (
                ratingText.includes(query) ||
                course.includes(query) ||
                scores.includes(query) ||
                scheduleMatch.includes(query)
            );
        });
    }, [sortedProcessedRatings, search, status]);

    if (!processedRatings && (error || isPending)) {
        return (
            <AdminSection title="Processed Ratings">
                <InlineQueryState
                    wrapperClassName=""
                    titleClassName=""
                    isPending={isPending}
                    error={error}
                    loadingMessage="Loading processed ratings..."
                    fallbackErrorMessage="Unable to load processed ratings. Please try again."
                    errorClassName="text-destructive"
                />
            </AdminSection>
        );
    }

    const sourceTotal = processedRatings?.length ?? 0;
    const hasFilters = Boolean(search.trim() || status);
    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(filteredRatings, page);

    return (
        <AdminSection title="Processed Ratings" count={sourceTotal} countLabel="logged">
            {error && (
                <InlineQueryState
                    wrapperClassName="mb-4"
                    error={error}
                    fallbackErrorMessage="Unable to refresh processed ratings. Showing last loaded data."
                    errorClassName="text-destructive"
                />
            )}
            <div className={filterBarClassName}>
                <AdminSearchInput
                    id="processed-search"
                    label="Search"
                    value={search}
                    onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                    }}
                    placeholder="Rating text, course, or score name"
                />
                <div className="flex w-full flex-col gap-1 sm:w-48">
                    <Select
                        label="Status"
                        options={[
                            { value: "", label: "All statuses" },
                            ...PENDING_RATING_STATUSES.map((value) => ({
                                value,
                                label: value,
                            })),
                        ]}
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(0);
                        }}
                        wrapperClassName="w-full"
                    />
                </div>
            </div>
            <div className={tableSurfaceClassName}>
                <Table aria-label="Processed Ratings">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Top risks</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="w-16">
                                <span className="sr-only">Open</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow
                                colSpan={5}
                                message={emptyStateMessage({
                                    hasSourceData: sourceTotal > 0,
                                    hasFilters,
                                    emptyLabel: "No processed ratings in the log.",
                                    noMatchLabel: "No processed ratings match your filters.",
                                })}
                            />
                        ) : (
                            pageRows.map((row: PendingRating) => (
                                <TableRow key={row.id}>
                                    <TableCell className="align-top whitespace-normal">
                                        <div className="flex flex-col gap-1">
                                            <Badge
                                                variant={statusBadgeVariant(row.status)}
                                                className="w-fit rounded-md"
                                            >
                                                {row.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {row.department} {row.courseNum}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(row.postDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top whitespace-normal">
                                        <ScheduleMatchBadge scheduleMatch={row.scheduleMatch} />
                                    </TableCell>
                                    <TableCell className="align-top whitespace-normal">
                                        <ScoreBars analyzedScores={row.analyzedScores} />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <RatingTextCell text={row.rating} />
                                        {row.error && (
                                            <p
                                                className={cn(
                                                    "mt-2 text-xs text-destructive",
                                                    "max-w-md whitespace-normal",
                                                )}
                                            >
                                                {row.error}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            aria-label="Open professor page"
                                            onClick={() =>
                                                window
                                                    .open(`/professor/${row.professor}`, "_blank")
                                                    ?.focus()
                                            }
                                        >
                                            <ExternalLink className="size-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <AdminTablePagination
                    total={total}
                    page={currentPage}
                    pageCount={pageCount}
                    onPrevious={() => setPage(currentPage - 1)}
                    onNext={() => setPage(currentPage + 1)}
                />
            </div>
        </AdminSection>
    );
}
