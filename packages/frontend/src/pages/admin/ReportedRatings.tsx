import { Fragment, useMemo, useState } from "react";
import { Professor, RatingReport } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2 } from "lucide-react";
import { Button, InlineQueryState, Select } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuditRunner } from "@/hooks";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { trpc } from "@/trpc";
import { cn, toSelectOptions } from "@/utils";
import { RatingTextCell } from "@/pages/admin/RatingTextCell";
import {
    AdminSearchInput,
    AdminSection,
    AdminTableEmptyRow,
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
    { value: "43200", label: "12 hours" },
    { value: "86400", label: "1 day" },
    { value: "172800", label: "2 days" },
    { value: "259200", label: "3 days" },
    { value: "604800", label: "7 days" },
    { value: "1209600", label: "14 days" },
    { value: "2592000", label: "30 days" },
] as const;

function findProfessor(professors: Professor[] | undefined, professorId: string) {
    return professors?.find((professor) => professor.id === professorId);
}

function findRating(professor: Professor | undefined, ratingId: string) {
    return Object.values(professor?.reviews ?? {})
        .flat()
        .find((rating) => rating.id === ratingId);
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
    const [rangeSeconds, setRangeSeconds] = useState(86400);
    const duplicateMutation = trpc.admin.autoReportDuplicateUsers.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
    });
    const moderationMutation = trpc.admin.autoReportContentModeration.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
    });
    const duplicateAudit = useAuditRunner({
        mutate: (input) =>
            duplicateMutation.mutateAsync({
                ...input,
                withinSeconds: rangeSeconds,
                rangeLabel:
                    DUPLICATE_RANGE_OPTIONS.find((o) => o.value === String(rangeSeconds))?.label ??
                    "1 day",
            }),
        isPending: duplicateMutation.isPending,
        getMetricCount: (result) => result.duplicatesFound,
        completeMessage: (processed, count) =>
            `Processed ${processed} professors, found ${count} duplicate ratings.`,
    });
    const moderationAudit = useAuditRunner({
        mutate: moderationMutation.mutateAsync,
        isPending: moderationMutation.isPending,
        getMetricCount: (result) => result.moderationFlagged,
        completeMessage: (processed, count) =>
            `Processed ${processed} professors, found ${count} ratings to flag.`,
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
            const reasons = row.reports
                .map((r) => r.reason)
                .join(" ")
                .toLowerCase();
            return (
                professorName.includes(query) ||
                ratingText.includes(query) ||
                reasons.includes(query)
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
                    placeholder="Professor, rating, or reason"
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
            <div className="mb-4 space-y-4 rounded-lg border border-input bg-muted/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Select
                        label="Duplicate time range"
                        value={String(rangeSeconds)}
                        onChange={(e) => setRangeSeconds(Number(e.target.value))}
                        options={[...DUPLICATE_RANGE_OPTIONS]}
                        disabled={
                            duplicateAudit.progress.isRunning || duplicateAudit.progress.isPaused
                        }
                        wrapperClassName="w-full sm:w-48"
                    />
                </div>
                <AuditControls
                    progress={duplicateAudit.progress}
                    onRun={() => void duplicateAudit.runAudit()}
                    onPause={duplicateAudit.pauseAudit}
                    onResume={() =>
                        void duplicateAudit.runAudit(
                            duplicateAudit.progress.nextCursor ?? undefined,
                        )
                    }
                    isPending={duplicateAudit.isPending}
                    runLabel="Run full duplicate audit"
                    metricLabel="Duplicates found"
                />
                <Separator />
                <AuditControls
                    progress={moderationAudit.progress}
                    onRun={() => void moderationAudit.runAudit()}
                    onPause={moderationAudit.pauseAudit}
                    onResume={() =>
                        void moderationAudit.runAudit(
                            moderationAudit.progress.nextCursor ?? undefined,
                        )
                    }
                    isPending={moderationAudit.isPending}
                    runLabel="Run content moderation audit"
                    metricLabel="Ratings flagged"
                />
            </div>
            <div className={tableSurfaceClassName}>
                <Table aria-label="Reported Ratings">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                            <TableHead>Professor</TableHead>
                            <TableHead>Reports</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow
                                colSpan={4}
                                message={emptyStateMessage({
                                    hasSourceData: sourceTotal > 0,
                                    hasFilters,
                                    emptyLabel: "No reported ratings in the queue.",
                                    noMatchLabel: "No reported ratings match your filters.",
                                })}
                            />
                        ) : (
                            pageRows.map((row: RatingReport) => {
                                const professor = findProfessor(professors, row.professorId);
                                const rating = findRating(professor, row.ratingId);
                                const displayName = professor
                                    ? formatProfessorName(professor.lastName, professor.firstName)
                                    : "Professor record missing";

                                return (
                                    <TableRow key={row.ratingId}>
                                        <TableCell className="whitespace-normal">
                                            <div className="flex flex-col gap-1">
                                                {professor ? (
                                                    <a
                                                        href={`/professor/${professor.id}`}
                                                        className={cn(
                                                            adminLinkClassName,
                                                            "whitespace-nowrap",
                                                        )}
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
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md"
                                                        >
                                                            {professor.department}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-sm whitespace-normal">
                                            <div className="flex flex-col gap-2 text-sm">
                                                {row.reports.map((report, idx) => (
                                                    <Fragment
                                                        // Need to use index to help out with making each key unique
                                                        // eslint-disable-next-line react/no-array-index-key
                                                        key={idx + report.reason + report.email}
                                                    >
                                                        {idx !== 0 && <Separator />}
                                                        <div className="space-y-0.5">
                                                            {report.anonymousIdentifier && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    By {report.anonymousIdentifier}
                                                                </div>
                                                            )}
                                                            {report.email && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {report.email}
                                                                </div>
                                                            )}
                                                            <div className="text-foreground">
                                                                {report.reason}
                                                            </div>
                                                        </div>
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <RatingTextCell
                                                text={rating?.rating ?? ""}
                                                author={rating?.anonymousIdentifier}
                                            />
                                        </TableCell>
                                        <TableCell className="w-px whitespace-nowrap">
                                            <div className="flex flex-nowrap justify-end gap-2">
                                                <ConfirmAction
                                                    action={() => removeReport(row.ratingId)}
                                                    variant="default"
                                                    buttonText="Keep"
                                                    ariaLabel={`Keep rating for ${displayName}`}
                                                    title="Keep this rating?"
                                                    description="Dismiss the report and leave the rating on the professor's page."
                                                    confirmLabel="Keep rating"
                                                    icon={<ShieldCheck data-icon="inline-start" />}
                                                />
                                                <ConfirmAction
                                                    action={() => actOnReport(row.ratingId)}
                                                    variant="destructive"
                                                    buttonText="Remove"
                                                    ariaLabel={`Remove rating for ${displayName}`}
                                                    title="Remove this rating?"
                                                    description="Delete the rating and clear the report. This cannot be undone from the admin UI."
                                                    confirmLabel="Remove rating"
                                                    icon={<Trash2 data-icon="inline-start" />}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
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

type AuditProgress = {
    isRunning: boolean;
    isPaused: boolean;
    processedCount: number;
    totalProfessors: number;
    metricCount: number;
    nextCursor: string | null;
    message: string;
};

function AuditControls({
    progress,
    onRun,
    onPause,
    onResume,
    isPending,
    runLabel,
    metricLabel,
}: {
    progress: AuditProgress;
    onRun: () => void;
    onPause: () => void;
    onResume: () => void;
    isPending: boolean;
    runLabel: string;
    metricLabel: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    onClick={onRun}
                    disabled={progress.isRunning || progress.isPaused || isPending}
                >
                    {progress.isRunning ? "Running audit…" : runLabel}
                </Button>
                {progress.isRunning ? (
                    <Button type="button" variant="outline" onClick={onPause}>
                        Pause
                    </Button>
                ) : null}
                {progress.isPaused ? (
                    <Button type="button" variant="outline" onClick={onResume}>
                        Resume
                    </Button>
                ) : null}
            </div>
            {progress.processedCount > 0 || progress.isRunning ? (
                <AuditProgressDisplay
                    processedCount={progress.processedCount}
                    totalProfessors={progress.totalProfessors}
                    metricLabel={metricLabel}
                    metricCount={progress.metricCount}
                    isRunning={progress.isRunning}
                    message={progress.message}
                />
            ) : null}
        </div>
    );
}

function AuditProgressDisplay({
    processedCount,
    totalProfessors,
    metricLabel,
    metricCount,
    isRunning,
    message,
}: {
    processedCount: number;
    totalProfessors: number;
    metricLabel: string;
    metricCount: number;
    isRunning: boolean;
    message: string;
}) {
    const progressPercent = totalProfessors > 0 ? (processedCount / totalProfessors) * 100 : 0;

    return (
        <div className="space-y-1 text-sm text-muted-foreground">
            <div>
                Progress: {processedCount} / {totalProfessors} professors (
                {Math.round(progressPercent)}%)
            </div>
            <div>
                {metricLabel}: {metricCount}
            </div>
            {isRunning ? (
                <div className="h-2 w-full rounded-full bg-muted">
                    <div
                        className="h-2 rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            ) : null}
            <div>{message}</div>
        </div>
    );
}
