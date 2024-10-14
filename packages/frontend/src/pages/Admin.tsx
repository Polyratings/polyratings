/* eslint-disable no-restricted-syntax */
/* eslint-disable react/no-unstable-nested-components */
import { Fragment, lazy, Suspense, useState } from "react";
import { Professor, RatingReport, TruncatedProfessor } from "@backend/types/schema";
import { useQueryClient } from "@tanstack/react-query";
import { ExpanderComponentProps, TableProps } from "react-data-table-component";
import { Department } from "@backend/utils/const";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { Button } from "@/components/forms/Button";
import { AutoComplete, TextInput } from "@/components";
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
        onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("reports")),
    });
    const { mutate: actOnReport } = trpc.admin.actOnReport.useMutation({
        onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("reports")),
    });

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
                    buttonClassName="p-2 bg-green-500 text-white rounded"
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
                    buttonClassName="p-2 bg-red-500 text-white rounded"
                    buttonText="R"
                />
            ),
            grow: 0,
        },
    ];

    return (
        <div className="mt-4">
            <h2 className="ml-1">Reported Ratings:</h2>
            <DataTable columns={columns} data={ratingReports ?? []} pagination />
        </div>
    );
}

function PendingProfessors() {
    const { data: pendingProfessors } = useDbValues("professor-queue");
    const queryClient = useQueryClient();
    const { mutate: approvePendingProfessor } = trpc.admin.approvePendingProfessor.useMutation({
        onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
    });
    const { mutate: rejectPendingProfessor } = trpc.admin.rejectPendingProfessor.useMutation({
        onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
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
                    buttonClassName="p-2 bg-green-500 text-white rounded"
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
                    buttonClassName="p-2 bg-red-500 text-white rounded"
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
    const { mutateAsync: submitRating, isLoading: loadingSubmitRating } =
        trpc.ratings.add.useMutation();

    const queryClient = useQueryClient();
    const { mutateAsync: removePending, isLoading: loadingRemovePending } =
        trpc.admin.rejectPendingProfessor.useMutation({
            onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
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
        isLoading,
        error,
    } = trpc.admin.changePendingProfessorName.useMutation({
        onSuccess: () => queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
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
                disabled={isLoading}
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
            cell: (row: PendingRating) => (
                <div className="flex flex-col">
                    {Object.entries(row.analyzedScores ?? {}).map(([name, score]) => (
                        <div key={name}>
                            {name}: {score}
                        </div>
                    ))}
                </div>
            ),
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
                <div className="absolute p-2 w-28 z-50 bg-white shadow top-0 right-0">
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
