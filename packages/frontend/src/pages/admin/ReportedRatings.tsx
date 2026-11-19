import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Professor, Rating, RatingReport } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play, ShieldCheck, Trash2 } from "lucide-react";
import { Popover } from "radix-ui";
import { InlineQueryState, ProfessorTag, Select } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuditRunner } from "@/hooks";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { trpc } from "@/trpc";
import { cn, toSelectOptions } from "@/utils";
import { RatingTextCell } from "@/pages/admin/RatingTextCell";
import { scheduleMatchLabel } from "@/pages/admin/ScheduleMatchBadge";
import { ScheduleMatchDetail } from "@/pages/admin/ScheduleMatchDetail";
import {
    AdminSearchInput,
    AdminSection,
    AdminTablePagination,
    ConfirmAction,
    adminLinkClassName,
    createAdminMutationErrorHandler,
    emptyStateMessage,
    filterBarClassName,
    formatProfessorName,
    getAdminTablePage,
    tableSurfaceClassName,
} from "@/pages/admin/shared";

const DUPLICATE_RANGE_OPTIONS = [
    { value: "60", label: "1 minute" },
    { value: "300", label: "5 minutes" },
    { value: "600", label: "10 minutes" },
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "21600", label: "6 hours" },
    { value: "86400", label: "1 day" },
] as const;

const DEFAULT_DUPLICATE_RANGE_SECONDS = 600;

function findProfessor(professors: Professor[] | undefined, professorId: string) {
    return professors?.find((professor) => professor.id === professorId);
}

function findRating(professor: Professor | undefined, ratingId: string) {
    return Object.values(professor?.reviews ?? {})
        .flat()
        .find((rating) => rating.id === ratingId);
}

function findReportedCourse(professor: Professor | undefined, ratingId: string) {
    if (!professor) {
        return undefined;
    }
    for (const [course, ratings] of Object.entries(professor.reviews)) {
        if (ratings.some((rating) => rating.id === ratingId)) {
            return course;
        }
    }
    return undefined;
}

function formatPostDate(postDate: string) {
    const date = new Date(postDate);
    if (Number.isNaN(date.getTime())) {
        return postDate;
    }
    return date.toLocaleDateString("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatScore(score: number | undefined) {
    if (score == null || Number.isNaN(score)) {
        return "—";
    }
    const shown = Number.isInteger(score) ? String(score) : score.toFixed(1);
    return `${shown} / 4`;
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
    return (
        <p>
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="block text-sm text-foreground tabular-nums">{value}</span>
        </p>
    );
}

function RatingDetails({
    displayName,
    course,
    rating,
}: {
    displayName: string;
    course: string | undefined;
    rating: Rating | undefined;
}) {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Rating details for ${displayName}`}
                >
                    Details
                </Button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-50 w-80 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
                >
                    <Popover.Title className="mb-2 text-sm font-medium">
                        Rating details
                    </Popover.Title>
                    <div className="grid grid-cols-2 gap-3">
                        <Fact label="Class" value={course ?? "—"} />
                        <Fact
                            label="Posted"
                            value={rating?.postDate ? formatPostDate(rating.postDate) : "—"}
                        />
                        <Fact label="Course type" value={rating?.courseType ?? "—"} />
                        <Fact
                            label="Grade"
                            value={rating ? `${rating.grade} · ${rating.gradeLevel}` : "—"}
                        />
                        <Fact label="Overall" value={formatScore(rating?.overallRating)} />
                        <Fact
                            label="Presents clearly"
                            value={formatScore(rating?.presentsMaterialClearly)}
                        />
                        <Fact
                            label="Recognizes difficulties"
                            value={formatScore(rating?.recognizesStudentDifficulties)}
                        />
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

function ratingHref(professorId: string, course: string | undefined, ratingId: string) {
    const params = new URLSearchParams();
    if (course) {
        params.set("course", course);
    }
    const query = params.toString();
    return `/professor/${professorId}${query ? `?${query}` : ""}#rating-${ratingId}`;
}

export function ReportedRatings() {
    const {
        data: ratingReports,
        isPending: reportsPending,
        error: reportsError,
    } = useDbValues("reports");
    const {
        data: professorsResult,
        isPending: professorsPending,
        error: professorsError,
    } = trpc.admin.getProfessors.useQuery(
        {
            ids: ratingReports?.map((report) => report.professorId) ?? [],
        },
        { meta: { suppressGlobalErrorToast: true } },
    );
    const professors = professorsResult?.professors;
    const queryClient = useQueryClient();
    const { mutate: removeReport } = trpc.admin.removeReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
        onError: createAdminMutationErrorHandler("dismiss this report"),
    });
    const { mutate: actOnReport } = trpc.admin.actOnReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
        onError: createAdminMutationErrorHandler("remove the reported rating"),
    });
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [rangeSeconds, setRangeSeconds] = useState(DEFAULT_DUPLICATE_RANGE_SECONDS);
    // Freeze the selected range for the duration of a run/resume so pause cycles stay consistent.
    const activeDuplicateRangeRef = useRef({
        seconds: DEFAULT_DUPLICATE_RANGE_SECONDS,
        label: "10 minutes",
    });
    const invalidateReports = () => {
        void queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") });
    };
    // No per-batch invalidation — reloading the full reports list every batch is very expensive.
    const duplicateMutation = trpc.admin.autoReportDuplicateUsers.useMutation();
    const moderationMutation = trpc.admin.autoReportContentModeration.useMutation();
    const duplicateAudit = useAuditRunner({
        mutate: (input) =>
            duplicateMutation.mutateAsync({
                ...input,
                withinSeconds: activeDuplicateRangeRef.current.seconds,
                rangeLabel: activeDuplicateRangeRef.current.label,
            }),
        isPending: duplicateMutation.isPending,
        getMetricCount: (result) => result.duplicatesFound,
        completeMessage: (processed, count) =>
            `Processed ${processed} professors, found ${count} duplicate ratings.`,
        onSettled: invalidateReports,
    });
    const moderationAudit = useAuditRunner({
        mutate: moderationMutation.mutateAsync,
        isPending: moderationMutation.isPending,
        getMetricCount: (result) => result.moderationFlagged,
        completeMessage: (processed, count) =>
            `Processed ${processed} professors, found ${count} ratings to flag.`,
        onSettled: invalidateReports,
    });

    const reportsBlocked = !ratingReports && (reportsPending || Boolean(reportsError));
    const professorsBlocked = !professorsResult && (professorsPending || Boolean(professorsError));

    const filteredReports = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (ratingReports ?? []).filter((row) => {
            const professor = findProfessor(professors, row.professorId);
            const rating = findRating(professor, row.ratingId);
            if (department && professor?.department !== department) {
                return false;
            }
            if (!query) {
                return true;
            }
            const professorName = formatProfessorName(
                professor?.lastName,
                professor?.firstName,
            ).toLowerCase();
            const ratingText = (rating?.rating ?? "").toLowerCase();
            const course = (
                findReportedCourse(professor, row.ratingId) ??
                row.scheduleMatch?.submittedCourseKey ??
                ""
            ).toLowerCase();
            const reasons = row.reports
                .map((r) => r.reason)
                .join(" ")
                .toLowerCase();
            const scheduleMatch = row.scheduleMatch
                ? `${row.scheduleMatch.status} ${scheduleMatchLabel(row.scheduleMatch.status)} ${row.scheduleMatch.matchedCourseKeys.join(" ")}`.toLowerCase()
                : "";
            return (
                professorName.includes(query) ||
                course.includes(query) ||
                ratingText.includes(query) ||
                reasons.includes(query) ||
                scheduleMatch.includes(query)
            );
        });
    }, [ratingReports, professors, search, department]);

    if (reportsBlocked || professorsBlocked) {
        return (
            <AdminSection title="Reported Ratings">
                <InlineQueryState
                    wrapperClassName=""
                    titleClassName=""
                    isPending={reportsPending || professorsPending}
                    error={reportsError ?? professorsError}
                    loadingMessage="Loading reported ratings..."
                    fallbackErrorMessage="Unable to load reported ratings. Please try again."
                    errorClassName="text-destructive"
                />
            </AdminSection>
        );
    }

    const sourceTotal = ratingReports?.length ?? 0;
    const hasFilters = Boolean(search.trim() || department);
    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(filteredReports, page);

    return (
        <AdminSection title="Reported Ratings" count={sourceTotal} countLabel="reported">
            {(reportsError || professorsError) && (
                <InlineQueryState
                    wrapperClassName="mb-4"
                    error={reportsError ?? professorsError}
                    fallbackErrorMessage="Unable to refresh reported ratings. Showing last loaded data."
                    errorClassName="text-destructive"
                />
            )}
            <div className={filterBarClassName}>
                <AdminSearchInput
                    id="reported-search"
                    label="Search"
                    value={search}
                    onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                    }}
                    placeholder="Professor, class, rating, or reason"
                />
                <div className="flex w-full flex-col gap-1 sm:w-48">
                    <Select
                        label="Department"
                        options={[
                            { value: "", label: "All departments" },
                            ...toSelectOptions(DEPARTMENT_LIST),
                        ]}
                        value={department}
                        onChange={(e) => {
                            setDepartment(e.target.value);
                            setPage(0);
                        }}
                        wrapperClassName="w-full"
                    />
                </div>
            </div>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
                <AuditCard
                    title="Duplicate audit"
                    description="Flags ratings one submitter posted on the same professor within the time range."
                    progress={duplicateAudit.progress}
                    isPending={duplicateAudit.isPending}
                    metricLabel="Duplicates found"
                    onRun={() => {
                        activeDuplicateRangeRef.current = {
                            seconds: rangeSeconds,
                            label:
                                DUPLICATE_RANGE_OPTIONS.find(
                                    (o) => o.value === String(rangeSeconds),
                                )?.label ?? "10 minutes",
                        };
                        void duplicateAudit.runAudit();
                    }}
                    onPause={duplicateAudit.pauseAudit}
                    onResume={() =>
                        void duplicateAudit.runAudit(
                            duplicateAudit.progress.nextCursor ?? undefined,
                        )
                    }
                >
                    <Select
                        label="Time range"
                        value={String(rangeSeconds)}
                        onChange={(e) => setRangeSeconds(Number(e.target.value))}
                        options={[...DUPLICATE_RANGE_OPTIONS]}
                        disabled={
                            duplicateAudit.progress.isRunning || duplicateAudit.progress.isPaused
                        }
                        wrapperClassName="w-full sm:w-48"
                    />
                </AuditCard>
                <AuditCard
                    title="Content moderation audit"
                    description="Re-checks live ratings against the moderation thresholds and reports the ones that fail."
                    progress={moderationAudit.progress}
                    isPending={moderationAudit.isPending}
                    metricLabel="Ratings flagged"
                    onRun={() => void moderationAudit.runAudit()}
                    onPause={moderationAudit.pauseAudit}
                    onResume={() =>
                        void moderationAudit.runAudit(
                            moderationAudit.progress.nextCursor ?? undefined,
                        )
                    }
                />
            </div>
            {pageRows.length === 0 ? (
                <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                    {emptyStateMessage({
                        hasSourceData: sourceTotal > 0,
                        hasFilters,
                        emptyLabel: "No reported ratings in the queue.",
                        noMatchLabel: "No reported ratings match your filters.",
                    })}
                </p>
            ) : (
                <div className="space-y-4">
                    <ul className="space-y-4" aria-label="Reported Ratings">
                        {pageRows.map((row: RatingReport) => (
                            <li key={row.ratingId}>
                                <ReportReviewCard
                                    row={row}
                                    professor={findProfessor(professors, row.professorId)}
                                    onKeep={() => removeReport(row.ratingId)}
                                    onRemove={() => actOnReport(row.ratingId)}
                                />
                            </li>
                        ))}
                    </ul>
                    <div className={tableSurfaceClassName}>
                        <AdminTablePagination
                            total={total}
                            page={currentPage}
                            pageCount={pageCount}
                            onPrevious={() => setPage(currentPage - 1)}
                            onNext={() => setPage(currentPage + 1)}
                        />
                    </div>
                </div>
            )}
        </AdminSection>
    );
}

function ReportReviewCard({
    row,
    professor,
    onKeep,
    onRemove,
}: {
    row: RatingReport;
    professor: Professor | undefined;
    onKeep: () => void;
    onRemove: () => void;
}) {
    const rating: Rating | undefined = findRating(professor, row.ratingId);
    const course =
        findReportedCourse(professor, row.ratingId) ?? row.scheduleMatch?.submittedCourseKey;
    const displayName = professor
        ? formatProfessorName(professor.lastName, professor.firstName)
        : "Professor record missing";

    return (
        <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                    {professor ? (
                        <a
                            href={`/professor/${professor.id}`}
                            className={cn(adminLinkClassName, "whitespace-nowrap")}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {displayName}
                        </a>
                    ) : (
                        <span className="font-medium whitespace-nowrap text-foreground">
                            {displayName}
                        </span>
                    )}
                    {professor?.department ? (
                        <Badge variant="outline" className="rounded-md">
                            {professor.department}
                        </Badge>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <ConfirmAction
                        action={onKeep}
                        variant="default"
                        buttonText="Keep"
                        ariaLabel={`Keep rating for ${displayName}`}
                        title="Keep this rating?"
                        description="Dismiss the report and leave the rating on the professor's page."
                        confirmLabel="Keep rating"
                        icon={<ShieldCheck data-icon="inline-start" />}
                    />
                    <ConfirmAction
                        action={onRemove}
                        variant="destructive"
                        buttonText="Remove"
                        ariaLabel={`Remove rating for ${displayName}`}
                        title="Remove this rating?"
                        description="Delete the rating and clear the report. This cannot be undone from the admin UI."
                        confirmLabel="Remove rating"
                        icon={<Trash2 data-icon="inline-start" />}
                    />
                </div>
            </header>

            {!rating && (
                <p className="mt-3 text-sm text-muted-foreground">
                    The rating record is no longer on this professor.
                </p>
            )}

            {rating?.tags && rating.tags.length > 0 && (
                <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
                    {rating.tags.map((tag) => (
                        <li key={tag}>
                            <ProfessorTag tagName={tag} size="sm" />
                        </li>
                    ))}
                </ul>
            )}

            {row.scheduleMatch && (
                <section className="mt-5">
                    <h3 className="mb-2 text-sm font-medium text-foreground">Schedule</h3>
                    <ScheduleMatchDetail scheduleMatch={row.scheduleMatch} />
                </section>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <section>
                    <h3 className="mb-2 text-sm font-medium text-foreground">Dispute</h3>
                    <div className="space-y-3 text-sm">
                        {row.reports.map((report, index) => (
                            <div key={`${report.reason}-${report.email ?? ""}-${index}`}>
                                {index !== 0 && <Separator className="mb-3" />}
                                {report.anonymousIdentifier && (
                                    <p className="mb-1 text-xs text-muted-foreground">
                                        by {report.anonymousIdentifier}
                                    </p>
                                )}
                                {report.email && (
                                    <p className="text-xs text-muted-foreground">{report.email}</p>
                                )}
                                <p className="text-foreground">{report.reason}</p>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">
                            {professor && rating ? (
                                <a
                                    href={ratingHref(professor.id, course, rating.id)}
                                    className={adminLinkClassName}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Rating
                                </a>
                            ) : (
                                "Rating"
                            )}
                        </h3>
                        <RatingDetails displayName={displayName} course={course} rating={rating} />
                    </div>
                    <RatingTextCell
                        text={rating?.rating ?? ""}
                        author={rating?.anonymousIdentifier}
                    />
                </section>
            </div>
        </article>
    );
}

type AuditProgress = {
    isRunning: boolean;
    isPaused: boolean;
    processedCount: number;
    totalProfessors: number;
    metricCount: number;
    nextCursor: string | null;
    message: string;
};

function AuditCard({
    title,
    description,
    progress,
    isPending,
    metricLabel,
    onRun,
    onPause,
    onResume,
    children,
}: {
    title: string;
    description: string;
    progress: AuditProgress;
    isPending: boolean;
    metricLabel: string;
    onRun: () => void;
    onPause: () => void;
    onResume: () => void;
    children?: ReactNode;
}) {
    const headingId = useId();
    const { isRunning, isPaused, processedCount, totalProfessors, metricCount, message } = progress;
    const percent = totalProfessors > 0 ? Math.round((processedCount / totalProfessors) * 100) : 0;
    const hasProgress = processedCount > 0 || isRunning;

    return (
        <article
            aria-labelledby={headingId}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
        >
            <header className="space-y-1">
                <h3 id={headingId} className="font-semibold text-foreground">
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </header>
            {children}
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={onRun} disabled={isRunning || isPaused || isPending}>
                    {isRunning ? (
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                        <Play data-icon="inline-start" />
                    )}
                    {isRunning ? "Running…" : "Run audit"}
                </Button>
                {isRunning ? (
                    <Button type="button" variant="outline" onClick={onPause}>
                        <Pause data-icon="inline-start" />
                        Pause
                    </Button>
                ) : null}
                {isPaused ? (
                    <Button type="button" variant="outline" onClick={onResume}>
                        <Play data-icon="inline-start" />
                        Resume
                    </Button>
                ) : null}
            </div>
            {hasProgress ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Fact
                            label="Professors checked"
                            value={`${processedCount} / ${totalProfessors} (${percent}%)`}
                        />
                        <Fact label={metricLabel} value={metricCount} />
                    </div>
                    <Progress value={percent} aria-label={`${title} progress`} />
                </div>
            ) : null}
            <output className="block text-sm text-muted-foreground empty:hidden">{message}</output>
        </article>
    );
}
