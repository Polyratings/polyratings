/* eslint-disable no-restricted-syntax */
/* eslint-disable react/no-unstable-nested-components */
import { Fragment, lazy, Suspense, useState } from "react";
import { Professor, RatingReport, TruncatedProfessor } from "@backend/types/schema";
import { useQueryClient } from "@tanstack/react-query";
import { ExpanderComponentProps, TableProps } from "react-data-table-component";
import { Department, DEPARTMENT_LIST } from "@backend/utils/const";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { Button } from "@/components/forms/Button";
import { AutoComplete, Select, TextInput } from "@/components";
import { professorSearch } from "@/utils/ProfessorSearch";

const DataTableLazy = lazy(() => import("react-data-table-component"));

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
    return isAuthenticated ? (
        <div>
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <PendingProfessors />
                <ReportedRatings />
                <ProcessedRatings />
            </div>
        </div>
    ) : (
        <div>In order to use the admin panel you must be authenticated</div>
    );
}

function ReportedRatings() {
    const { data: ratingReports } = useDbValues("reports");
    const { data: professors } = trpc.professors.getMany.useQuery({
        ids: ratingReports?.map((report) => report.professorId) ?? [],
    });
    const queryClient = useQueryClient();
    const { mutate: removeReport } = trpc.admin.removeReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
    });
    const { mutate: actOnReport } = trpc.admin.actOnReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
    });
    const { mutateAsync: autoReportDuplicateUsers, isPending: isRunningAudit } =
        trpc.admin.autoReportDuplicateUsers.useMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
        });

    // State for audit progress
    const [auditProgress, setAuditProgress] = useState<{
        isRunning: boolean;
        isPaused: boolean;
        processedCount: number;
        totalProfessors: number;
        duplicatesFound: number;
        moderationFlagged: number;
        nextCursor: string | null;
        message: string;
    }>({
        isRunning: false,
        isPaused: false,
        processedCount: 0,
        totalProfessors: 0,
        duplicatesFound: 0,
        moderationFlagged: 0,
        nextCursor: null,
        message: "",
    });

    // Manual cursor input for resuming
    const [resumeCursor, setResumeCursor] = useState("");

    // Flag to request pause
    const [pauseRequested, setPauseRequested] = useState(false);

    const runFullAudit = async (startCursor?: string) => {
        setPauseRequested(false);
        setAuditProgress((prev) => ({
            ...prev,
            isRunning: true,
            isPaused: false,
            processedCount: startCursor ? prev.processedCount : 0,
            duplicatesFound: startCursor ? prev.duplicatesFound : 0,
            moderationFlagged: startCursor ? prev.moderationFlagged : 0,
            message: startCursor ? "Resuming audit..." : "Starting audit...",
        }));

        try {
            let cursor: string | undefined = startCursor;
            let totalProcessed = startCursor ? auditProgress.processedCount : 0;
            let totalDuplicates = startCursor ? auditProgress.duplicatesFound : 0;
            let totalModerationFlagged = startCursor ? auditProgress.moderationFlagged : 0;
            let totalProfessors = 0;

            do {
                // Check if pause was requested
                if (pauseRequested) {
                    const pauseMessage = `⏸️ Audit paused. Processed ${totalProcessed} professors. Use cursor below to resume.`;
                    const pauseCursor = cursor || null;
                    setAuditProgress((prev) => ({
                        ...prev,
                        isRunning: false,
                        isPaused: true,
                        nextCursor: pauseCursor,
                        message: pauseMessage,
                    }));
                    return;
                }

                // Sequential processing required to respect API rate limits and prevent overwhelming the server.
                // eslint-disable-next-line no-await-in-loop
                const result = await autoReportDuplicateUsers(cursor ? { cursor } : undefined);

                totalProcessed += result.processedCount;
                totalDuplicates += result.duplicatesFound;
                totalModerationFlagged += result.moderationFlagged || 0;
                totalProfessors = result.totalProfessors;
                cursor = result.nextCursor || undefined;

                setAuditProgress({
                    isRunning: result.hasMore,
                    isPaused: false,
                    processedCount: totalProcessed,
                    totalProfessors,
                    duplicatesFound: totalDuplicates,
                    moderationFlagged: totalModerationFlagged,
                    nextCursor: result.nextCursor,
                    message: result.message,
                });

                // Small delay between batches to prevent overwhelming the server
                if (result.hasMore && !pauseRequested) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                }
            } while (cursor && !pauseRequested);

            if (!pauseRequested) {
                setAuditProgress((prev) => ({
                    ...prev,
                    isRunning: false,
                    isPaused: false,
                    message:
                        `✅ Audit complete! Processed ${totalProcessed} professors, found ${totalDuplicates}` +
                        ` duplicate ratings, and flagged ${totalModerationFlagged} for moderation.`,
                }));
            }
        } catch (error) {
            setAuditProgress((prev) => ({
                ...prev,
                isRunning: false,
                isPaused: false,
                message: `❌ Error during audit: ${error instanceof Error ? error.message : "Unknown error"}`,
            }));
        }
    };

    const pauseAudit = () => {
        setPauseRequested(true);
    };

    const resumeFromCursor = () => {
        if (resumeCursor.trim()) {
            runFullAudit(resumeCursor.trim());
            setResumeCursor("");
        }
    };

    const columns = [
        {
            name: "Professor",
            grow: 0.5,
            cell: (row: RatingReport) => {
                const professor = professors?.find(
                    (professor) => professor?.id === row.professorId,
                );
                return `${professor?.lastName}, ${professor?.firstName}`;
            },
        },
        {
            name: "Department",
            grow: 0.5,
            selector: (row: RatingReport) => {
                const professor = professors?.find(
                    (professor) => professor?.id === row.professorId,
                );
                return professor?.department ?? "";
            },
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
                const professor = professors?.find(
                    (professor) => professor?.id === row.professorId,
                );
                return (
                    Object.values(professor?.reviews ?? {})
                        .flat()
                        .find((rating) => rating.id === row.ratingId)?.rating ?? ""
                );
            },
        },
        {
            name: "Rating By",
            grow: 0.5,
            selector: (row: RatingReport) => {
                const professor = professors?.find(
                    (professor) => professor?.id === row.professorId,
                );

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
            <h2 className="ml-1">Reported Ratings:</h2>

            {/* Audit Controls */}
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-4 mb-2">
                    <Button
                        type="button"
                        onClick={() => runFullAudit()}
                        disabled={auditProgress.isRunning || isRunningAudit}
                        className={auditProgress.isRunning ? "bg-gray-400" : ""}
                    >
                        {auditProgress.isRunning ? "Running Audit..." : "Run Full Duplicate Audit"}
                    </Button>

                    {auditProgress.isRunning && (
                        <Button
                            type="button"
                            onClick={pauseAudit}
                            className="bg-yellow-500 hover:bg-yellow-600"
                        >
                            Pause Audit
                        </Button>
                    )}

                    {auditProgress.isPaused && (
                        <Button
                            type="button"
                            onClick={() => runFullAudit(auditProgress.nextCursor || undefined)}
                            className="bg-green-500 hover:bg-green-600"
                        >
                            Resume Audit
                        </Button>
                    )}
                </div>

                {/* Manual Resume Section */}
                {(auditProgress.isPaused || auditProgress.nextCursor) && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h4 className="font-medium mb-2">Resume from Cursor:</h4>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="text"
                                value={resumeCursor}
                                onChange={(e) => setResumeCursor(e.target.value)}
                                placeholder="Enter cursor to resume from..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                            <Button
                                type="button"
                                onClick={resumeFromCursor}
                                disabled={!resumeCursor.trim()}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                Resume
                            </Button>
                        </div>
                        {auditProgress.nextCursor && (
                            <div className="text-sm">
                                <p className="text-gray-600 mb-1">Current cursor:</p>
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                                    {auditProgress.nextCursor}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            auditProgress.nextCursor || "",
                                        );
                                    }}
                                    className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                                >
                                    Copy
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Progress Display */}
                {(auditProgress.processedCount > 0 || auditProgress.isRunning) &&
                    (() => {
                        const progressPercent =
                            auditProgress.totalProfessors > 0
                                ? (auditProgress.processedCount / auditProgress.totalProfessors) *
                                  100
                                : 0;
                        return (
                            <div className="text-sm space-y-1">
                                <div>
                                    Progress: {auditProgress.processedCount} /{" "}
                                    {auditProgress.totalProfessors} professors (
                                    {Math.round(progressPercent)}
                                    %)
                                </div>
                                <div>Duplicates Found: {auditProgress.duplicatesFound}</div>
                                <div>Moderation Flagged: {auditProgress.moderationFlagged}</div>
                                {auditProgress.isRunning && (
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                // eslint-disable-next-line max-len
                                                width: `${progressPercent}%`,
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="text-gray-600">{auditProgress.message}</div>
                            </div>
                        );
                    })()}
            </div>

            <DataTable columns={columns} data={ratingReports ?? []} pagination />
        </div>
    );
}

function PendingProfessors() {
    const { data: pendingProfessors } = useDbValues("professor-queue");
    const queryClient = useQueryClient();
    const { mutate: approvePendingProfessor } = trpc.admin.approvePendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
    });
    const { mutate: rejectPendingProfessor } = trpc.admin.rejectPendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
    });

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

    const { data: allProfessors } = trpc.professors.all.useQuery();
    const { mutateAsync: submitRating, isPending: loadingSubmitRating } =
        trpc.ratings.add.useMutation();

    const queryClient = useQueryClient();
    const { mutateAsync: removePending, isPending: loadingRemovePending } =
        trpc.admin.rejectPendingProfessor.useMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        });

    const isLoading = loadingSubmitRating || loadingRemovePending;

    const submit = async () => {
        if (!destProfessor) {
            return;
        }

        for (const [course, ratings] of Object.entries(professor.reviews)) {
            const [dep, num] = course.split(" ");
            for (const rating of ratings) {
                // eslint-disable-next-line no-await-in-loop
                await submitRating({
                    ...rating,
                    professor: destProfessor.id,
                    department: dep as Department,
                    courseNum: parseFloat(num),
                });
            }
        }

        await removePending(professor.id);
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
                disabled={!destProfessor || isLoading}
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
            {error?.message && <span className="text-red text-sm">{error.message}</span>}
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
            {error?.message && <span className="text-red text-sm">{error.message}</span>}
        </div>
    );
}

function ProcessedRatings() {
    const { data: processedRatings } = useDbValues("rating-log");
    type PendingRating = NonNullable<typeof processedRatings>[0];

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
