/* eslint-disable no-restricted-syntax */
/* eslint-disable react/no-unstable-nested-components */
import { Fragment, lazy, Suspense, useState } from "react";
import { Professor, RatingReport, TruncatedProfessor } from "@backend/types/schema";
import { useQueryClient } from "@tanstack/react-query";
import { ExpanderComponentProps, TableProps } from "react-data-table-component";
import { Department, DEPARTMENT_LIST } from "@backend/utils/const";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { toast } from "react-toastify";
import { Navigate } from "react-router";
import { useAuth, useAuditRunner } from "@/hooks";
import { trpc } from "@/trpc";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { Button } from "@/components/forms/Button";
import { AutoComplete, InlineQueryState, Select, TextInput } from "@/components";
import { professorSearch } from "@/utils/ProfessorSearch";
import { getApiErrorMessage } from "@/utils";

const DataTableLazy = lazy(() => import("react-data-table-component"));

function createAdminMutationErrorHandler(action: string) {
    return (error: unknown) => {
        toast.error(getApiErrorMessage(error, `Failed to ${action}.`));
    };
}

function DataTable<T>({ ...rest }: TableProps<T>) {
    return (
        <Suspense fallback={<>Data Table is Loading</>}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <DataTableLazy {...(rest as any)} />
        </Suspense>
    );
}

export function Admin() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return (
        <div>
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <PendingProfessors />
                <ReportedRatings />
                <ProcessedRatings />
            </div>
        </div>
    );
}

function ReportedRatings() {
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
    const RANGE_OPTIONS = [
        { value: "43200", label: "12 hours" },
        { value: "86400", label: "1 day" },
        { value: "172800", label: "2 days" },
        { value: "259200", label: "3 days" },
        { value: "604800", label: "7 days" },
        { value: "1209600", label: "14 days" },
        { value: "2592000", label: "30 days" },
    ] as const;
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
                    RANGE_OPTIONS.find((o) => o.value === String(rangeSeconds))?.label ?? "1 day",
            }),
        isPending: duplicateMutation.isPending,
        getMetricCount: (r) => r.duplicatesFound,
        completeMessage: (processed: number, n: number) =>
            `Processed ${processed} professors, found ${n} duplicate ratings.`,
    });

    const moderationAudit = useAuditRunner({
        mutate: moderationMutation.mutateAsync,
        isPending: moderationMutation.isPending,
        getMetricCount: (r: { moderationFlagged: number }) => r.moderationFlagged,
        completeMessage: (processed: number, n: number) =>
            `Processed ${processed} professors, found ${n} ratings to flag.`,
    });

    const reportsBlocked = !ratingReports && (reportsPending || Boolean(reportsError));
    const professorsBlocked = !professorsResult && (professorsPending || Boolean(professorsError));

    if (reportsBlocked || professorsBlocked) {
        return (
            <InlineQueryState
                title="Reported Ratings:"
                titleClassName="ml-1"
                isPending={reportsPending || professorsPending}
                error={reportsError ?? professorsError}
                loadingMessage="Loading reported ratings..."
                fallbackErrorMessage="Unable to load reported ratings. Please try again."
            />
        );
    }

    const findProfessor = (professorId: string): Professor | undefined =>
        professors?.find((p) => p.id === professorId);

    const columns = [
        {
            name: "Professor",
            grow: 0.5,
            cell: (row: RatingReport) => {
                const professor = findProfessor(row.professorId);
                if (!professor) return "Professor record missing";
                return `${professor.lastName}, ${professor.firstName}`;
            },
        },
        {
            name: "Department",
            grow: 0.5,
            selector: (row: RatingReport) => findProfessor(row.professorId)?.department ?? "",
        },
        {
            name: "Reason",
            wrap: true,
            grow: 1.5,
            cell: (row: RatingReport) => (
                <div className="flex flex-col w-full">
                    {row.reports.map((report, idx) => (
                        // Need to use index to help out with making each key unique
                        // eslint-disable-next-line react/no-array-index-key
                        <Fragment key={idx + report.reason + report.email}>
                            {idx !== 0 && <div className="w-full h-1 bg-black my-2" />}
                            {report.anonymousIdentifier && (
                                <div>Submitted By: {report.anonymousIdentifier}</div>
                            )}
                            {report.email && <div>Email: {report.email}</div>}
                            <div>Reason: {report.reason}</div>
                        </Fragment>
                    ))}
                </div>
            ),
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: RatingReport) => {
                const professor = findProfessor(row.professorId);
                const ratings = Object.values(professor?.reviews ?? {}).flat();
                return ratings.find((rating) => rating.id === row.ratingId)?.rating ?? "";
            },
        },
        {
            name: "Rating By",
            grow: 0.5,
            selector: (row: RatingReport) => {
                const professor = findProfessor(row.professorId);
                return (
                    Object.values(professor?.reviews ?? {})
                        .flat()
                        .find((rating) => rating.id === row.ratingId)?.anonymousIdentifier ?? ""
                );
            },
        },
        {
            name: "Keep",
            cell: (row: RatingReport) => (
                <ConfirmationButton
                    action={() => removeReport(row.ratingId)}
                    buttonClassName="p-2 bg-green-500 text-white rounded-sm"
                    buttonText="K"
                />
            ),
            grow: 0,
        },
        {
            name: "Remove",
            cell: (row: RatingReport) => (
                <ConfirmationButton
                    action={() => actOnReport(row.ratingId)}
                    buttonClassName="p-2 bg-red-500 text-white rounded-sm"
                    buttonText="R"
                />
            ),
            grow: 0,
        },
    ];

    return (
        <div className="mt-4">
            {(reportsError || professorsError) && (
                <InlineQueryState
                    error={reportsError ?? professorsError}
                    fallbackErrorMessage="Unable to refresh reported ratings. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Reported Ratings:</h2>

            {/* Audit Controls */}
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                <div className="flex items-end gap-4 mb-2">
                    <Select
                        label="Time range"
                        value={rangeSeconds.toString()}
                        onChange={(e) => setRangeSeconds(Number(e.target.value))}
                        options={[...RANGE_OPTIONS]}
                        disabled={
                            duplicateAudit.progress.isRunning || duplicateAudit.progress.isPaused
                        }
                    />
                </div>
                <AuditControls
                    progress={duplicateAudit.progress}
                    onRun={() => duplicateAudit.runAudit()}
                    onPause={duplicateAudit.pauseAudit}
                    onResume={() =>
                        duplicateAudit.runAudit(duplicateAudit.progress.nextCursor ?? undefined)
                    }
                    isPending={duplicateAudit.isPending}
                    runLabel="Run Full Duplicate Audit"
                    metricLabel="Duplicates Found"
                />

                {/* Content Moderation Audit */}
                <div className="mt-4 pt-4 border-t border-gray-300">
                    <AuditControls
                        progress={moderationAudit.progress}
                        onRun={() => moderationAudit.runAudit()}
                        onPause={moderationAudit.pauseAudit}
                        onResume={() =>
                            moderationAudit.runAudit(
                                moderationAudit.progress.nextCursor ?? undefined,
                            )
                        }
                        isPending={moderationAudit.isPending}
                        runLabel="Run Content Moderation Audit"
                        metricLabel="Ratings Flagged"
                    />
                </div>
            </div>

            <DataTable columns={columns} data={ratingReports ?? []} pagination />
        </div>
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
        <>
            <div className="flex items-center gap-4 mb-2">
                <Button
                    type="button"
                    onClick={onRun}
                    disabled={progress.isRunning || progress.isPaused || isPending}
                    className={progress.isRunning || progress.isPaused ? "bg-gray-400" : ""}
                >
                    {progress.isRunning ? "Running Audit..." : runLabel}
                </Button>
                {progress.isRunning && (
                    <Button
                        type="button"
                        onClick={onPause}
                        className="bg-yellow-500 hover:bg-yellow-600"
                    >
                        Pause Audit
                    </Button>
                )}
                {progress.isPaused && (
                    <Button
                        type="button"
                        onClick={onResume}
                        className="bg-green-500 hover:bg-green-600"
                    >
                        Resume Audit
                    </Button>
                )}
            </div>
            {(progress.processedCount > 0 || progress.isRunning) && (
                <AuditProgressDisplay
                    processedCount={progress.processedCount}
                    totalProfessors={progress.totalProfessors}
                    metricLabel={metricLabel}
                    metricCount={progress.metricCount}
                    isRunning={progress.isRunning}
                    message={progress.message}
                />
            )}
        </>
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
        <div className="text-sm space-y-1">
            <div>
                Progress: {processedCount} / {totalProfessors} professors (
                {Math.round(progressPercent)}%)
            </div>
            <div>
                {metricLabel}: {metricCount}
            </div>
            {isRunning && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}
            <div className="text-gray-600">{message}</div>
        </div>
    );
}

function PendingProfessors() {
    const { data: pendingProfessors, isPending, error } = useDbValues("professor-queue");
    const queryClient = useQueryClient();
    const { mutate: approvePendingProfessor } = trpc.admin.approvePendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        onError: createAdminMutationErrorHandler("approve pending professor"),
    });
    const { mutate: rejectPendingProfessor } = trpc.admin.rejectPendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        onError: createAdminMutationErrorHandler("reject pending professor"),
    });

    if (!pendingProfessors && (error || isPending)) {
        return (
            <InlineQueryState
                title="Pending Professors:"
                titleClassName="ml-1"
                isPending={isPending}
                error={error}
                loadingMessage="Loading pending professors..."
                fallbackErrorMessage="Unable to load pending professors. Please try again."
            />
        );
    }

    const columns = [
        {
            name: "Professor",
            cell: (row: Professor) => (
                <a
                    href={`http://www.google.com/search?q=${row.lastName}+${row.firstName}+Cal+Poly`}
                    className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
                    target="_blank"
                    rel="noreferrer"
                >
                    {row.lastName}, {row.firstName}
                </a>
            ),
        },
        {
            name: "Department",
            selector: (row: Professor) => row.department,
        },
        {
            name: "Rating Course",
            selector: (row: Professor) => Object.keys(row.reviews ?? {})[0],
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: Professor) => Object.values(row.reviews ?? {})[0][0].rating,
        },
        {
            name: "Approve",
            cell: (row: Professor) => (
                <ConfirmationButton
                    action={async () => approvePendingProfessor(row.id)}
                    buttonClassName="p-2 bg-green-500 text-white rounded-sm"
                    buttonText="✓"
                />
            ),
            grow: 0,
        },
        {
            name: "Deny",
            cell: (row: Professor) => (
                <ConfirmationButton
                    action={async () => rejectPendingProfessor(row.id)}
                    buttonClassName="p-2 bg-red-500 text-white rounded-sm"
                    buttonText="X"
                />
            ),
            grow: 0,
        },
    ];

    return (
        <div className="mt-4">
            {error && (
                <InlineQueryState
                    error={error}
                    fallbackErrorMessage="Unable to refresh pending professors. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Pending Professors:</h2>
            <DataTable
                expandableRows
                expandableRowsComponent={PendingProfessorActions}
                columns={columns}
                data={pendingProfessors ?? []}
                pagination
            />
        </div>
    );
}

function PendingProfessorActions({ data: professor }: ExpanderComponentProps<Professor>) {
    return (
        <div className="flex flex-col gap-2 pl-2 pt-4">
            <SubmitUnderAction professor={professor} />
            <ChangeNameAction professor={professor} />
            <ChangeNameDepartment professor={professor} />
        </div>
    );
}

type PendingProfessorAction = {
    professor: Professor;
};

function SubmitUnderAction({ professor }: PendingProfessorAction) {
    const [destProfessor, setDestProfessor] = useState<TruncatedProfessor | undefined>(undefined);
    const [searchValue, setSearchValue] = useState("");

    const { data: allProfessors } = trpc.professors.all.useQuery(undefined, {
        meta: { suppressGlobalErrorToast: true },
    });

    const queryClient = useQueryClient();
    const { mutateAsync: submitUnder, isPending } =
        trpc.admin.submitPendingUnderProfessor.useMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
            meta: { suppressGlobalErrorToast: true },
        });

    const submit = async () => {
        if (!destProfessor) {
            return;
        }

        try {
            await submitUnder({ destId: destProfessor.id, sourceId: professor.id });
            toast.success("Submitted ratings under selected professor.");
        } catch (submitError) {
            toast.error(
                getApiErrorMessage(
                    submitError,
                    "Failed to submit ratings under selected professor.",
                ),
            );
        }
    };

    return (
        <div className="flex gap-2 items-center">
            <div className="text-sm">
                <span>Submit under </span>
                <span className="font-bold">
                    {destProfessor
                        ? `${destProfessor.lastName}, ${destProfessor.firstName}`
                        : "undefined"}
                </span>
            </div>
            <AutoComplete
                className="w-80 z-50"
                inputClassName="border border-black"
                items={allProfessors ?? []}
                filterFn={(items, inputValue) =>
                    professorSearch(items, "name", inputValue).map((t) => ({
                        label: `${t.lastName}, ${t.firstName}`,
                        value: t.id,
                    }))
                }
                inputValue={searchValue}
                onChange={({ selection, inputValue }) => {
                    setSearchValue(inputValue);
                    if (selection) {
                        setDestProfessor(allProfessors?.find((p) => p.id === selection));
                    }
                }}
                label="Submit To:"
                placeholder="Professor Name"
                disableDropdown={false}
            />
            <Button
                onClick={() => submit()}
                disabled={!destProfessor || isPending}
                className="text-sm"
            >
                Submit
            </Button>
        </div>
    );
}

function ChangeNameAction({ professor }: PendingProfessorAction) {
    const [first, setFirst] = useState(professor.firstName);
    const [last, setLast] = useState(professor.lastName);

    const queryClient = useQueryClient();
    const {
        mutate: setName,
        isPending,
        error,
    } = trpc.admin.changePendingProfessorName.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        meta: { suppressGlobalErrorToast: true },
    });

    return (
        <div className="flex gap-2 items-center text-sm">
            <span>Change Name</span>
            <TextInput
                className="w-40"
                label=""
                placeholder="Last"
                value={last}
                onChange={(e) => setLast(e.target.value)}
            />
            <TextInput
                className="w-40"
                label=""
                placeholder="First"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
            />
            <Button
                disabled={isPending}
                onClick={() =>
                    setName({
                        professorId: professor.id,
                        firstName: first,
                        lastName: last,
                    })
                }
            >
                Submit
            </Button>
            {error && (
                <span className="text-red text-sm">
                    {getApiErrorMessage(error, "Failed to update pending professor name.")}
                </span>
            )}
        </div>
    );
}

function ChangeNameDepartment({ professor }: PendingProfessorAction) {
    const [department, setDepartment] = useState(professor.department);

    const queryClient = useQueryClient();
    const {
        mutate: setProfessorDepartment,
        isPending,
        error,
    } = trpc.admin.changePendingProfessorDepartment.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        meta: { suppressGlobalErrorToast: true },
    });

    return (
        <div className="flex gap-2 items-center text-sm">
            <span>Change Department</span>
            <Select
                label=""
                options={DEPARTMENT_LIST.map((dep) => ({ label: dep, value: dep }))}
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
            />
            <Button
                disabled={isPending}
                onClick={() =>
                    setProfessorDepartment({
                        professorId: professor.id,
                        department,
                    })
                }
            >
                Submit
            </Button>
            {error && (
                <span className="text-red text-sm">
                    {getApiErrorMessage(error, "Failed to update pending professor department.")}
                </span>
            )}
        </div>
    );
}

function ProcessedRatings() {
    const { data: processedRatings, isPending, error } = useDbValues("rating-log");
    type PendingRating = NonNullable<typeof processedRatings>[0];
    if (!processedRatings && (error || isPending)) {
        return (
            <InlineQueryState
                title="Processed Ratings:"
                titleClassName="ml-1"
                isPending={isPending}
                error={error}
                loadingMessage="Loading processed ratings..."
                fallbackErrorMessage="Unable to load processed ratings. Please try again."
            />
        );
    }

    const sortedProcessedRatings =
        (processedRatings ?? []).sort(
            (ratingA, ratingB) => Date.parse(ratingB.postDate) - Date.parse(ratingA.postDate),
        ) ?? [];

    const columns = [
        {
            name: "Status",
            selector: (row: PendingRating) => row.status,
            grow: 0.5,
        },
        {
            name: "Scores",
            grow: 1.5,
            cell: (row: PendingRating) => {
                let scores;

                if (row.analyzedScores && "category_scores" in row.analyzedScores) {
                    scores = row.analyzedScores.category_scores;
                } else {
                    // Handle old Perspective ratings
                    scores = row.analyzedScores ?? {};
                }

                return (
                    <div className="flex flex-col">
                        {Object.entries(scores).map(([name, score]) => (
                            <div key={name}>
                                {name}: {score}
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: PendingRating) => row.rating,
        },
        {
            name: "Open",
            grow: 0.5,
            cell: (row: PendingRating) => (
                <Button
                    onClick={() => window.open(`/professor/${row.professor}`, "_blank")?.focus()}
                >
                    <ArrowTopRightOnSquareIcon className="text-white w-6 h-6" />
                </Button>
            ),
        },
    ];

    return (
        <div className="mt-4">
            {error && (
                <InlineQueryState
                    error={error}
                    fallbackErrorMessage="Unable to refresh processed ratings. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Processed Ratings:</h2>
            <DataTable columns={columns} data={sortedProcessedRatings} pagination />
        </div>
    );
}

interface ConfirmationButtonProps {
    action: () => void | Promise<void>;
    buttonClassName: string;
    buttonText: string;
}
export function ConfirmationButton({
    action,
    buttonClassName,
    buttonText,
}: ConfirmationButtonProps) {
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const handleConfirmation = () => {
        setConfirmationOpen(false);
        action();
    };

    return (
        <div className="relative" onBlur={() => setConfirmationOpen(false)}>
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setConfirmationOpen(true)}
            >
                {buttonText}
            </button>
            {confirmationOpen && (
                <div className="absolute p-2 w-28 z-50 bg-white shadow-sm top-0 right-0">
                    <div>Are You Sure?</div>
                    <div className="flex justify-between mt-1">
                        <button
                            className="bg-green-500 px-2 py-1 text-white"
                            type="button"
                            onClick={() => handleConfirmation()}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            YES
                        </button>
                        <button className="bg-red-500 px-2 py-1 text-white" type="button">
                            NO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
