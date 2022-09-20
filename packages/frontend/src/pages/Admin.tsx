/* eslint-disable react/no-unstable-nested-components */
import { Fragment, lazy, Suspense, useEffect, useState } from "react";
import { Professor, RatingReport } from "@backend/types/schema";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";

const DataTableLazy = lazy(() => import("react-data-table-component"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DataTable({ ...rest }: any) {
    return (
        <Suspense fallback={<>Data Table is Loading</>}>
            <DataTableLazy {...rest} />
        </Suspense>
    );
}

export function Admin() {
    const authenticated = useAuth();
    return authenticated ? (
        <div>
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <PendingProfessors />
                <ReportedReviews />
                <ProcessedReviews />
                <RecentReviews />
            </div>
        </div>
    ) : (
        <div>In order to use the admin panel you must be authenticated</div>
    );
}

function ReportedReviews() {
    const { data: ratingReports } = useDbValues("reports");
    const { data: professors } = trpc.useQuery([
        "getProfessors",
        ratingReports?.map((report) => report.professorId) ?? [],
    ]);
    const { mutate: removeReport } = trpc.useMutation("removeReport");
    const { mutate: actOnReport } = trpc.useMutation("actOnReport");

    const columns = [
        {
            name: "Professor",
            grow: 0.5,
            selector: (row: RatingReport) => {
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
                return professor?.department;
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
                return Object.values(professor?.reviews ?? {})
                    .flat()
                    .find((rating) => rating.id === row.ratingId)?.rating;
            },
        },
        {
            name: "Keep Rating",
            cell: (row: RatingReport) => (
                <ConfirmationButton
                    action={() => removeReport(row.ratingId)}
                    buttonClassName="p-2 bg-green-500 text-white rounded"
                    buttonText="K"
                />
            ),
            center: true,
            grow: 0,
        },
        {
            name: "Remove Rating",
            cell: (row: RatingReport) => (
                <ConfirmationButton
                    action={() => actOnReport(row.ratingId)}
                    buttonClassName="p-2 bg-red-500 text-white rounded"
                    buttonText="R"
                />
            ),
            center: true,
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
    const trpcContext = trpc.useContext();
    const { mutate: approvePendingProfessor } = trpc.useMutation("approvePendingTeacher", {
        onSuccess: () =>
            trpcContext.queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
    });
    const { mutate: rejectPendingProfessor } = trpc.useMutation("rejectPendingProfessor", {
        onSuccess: () =>
            trpcContext.queryClient.invalidateQueries(bulkInvalidationKey("professor-queue")),
    });

    const columns = [
        {
            name: "Professor",
            selector: (row: Professor) => `${row.lastName}, ${row.firstName}`,
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
                    buttonClassName="p-2 bg-green-500 text-white rounded"
                    buttonText="✓"
                />
            ),
            center: true,
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
            center: true,
            grow: 0,
        },
    ];

    return (
        <div className="mt-4">
            <h2 className="ml-1">Pending Professors:</h2>
            <DataTable columns={columns} data={pendingProfessors ?? []} pagination />
        </div>
    );
}

function ProcessedReviews() {
    const { data: processedReviews } = useDbValues("rating-queue");
    type PendingReview = NonNullable<typeof processedReviews>[0];

    const columns = [
        {
            name: "Status",
            selector: (row: PendingReview) => row.status,
            grow: 0.5,
        },
        {
            name: "Scores",
            grow: 1.5,
            cell: (row: PendingReview) => (
                <div className="flex flex-col">
                    {Object.entries(row.sentimentResponse ?? {}).map(([name, score]) => (
                        <div key={name}>
                            {name}: {score.summaryScore.value}
                        </div>
                    ))}
                </div>
            ),
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: PendingReview) => row.rating,
        },
    ];

    return (
        <div className="mt-4">
            <h2 className="ml-1">Processed Reviews:</h2>
            <DataTable columns={columns} data={processedReviews ?? []} pagination />
        </div>
    );
}

function RecentReviews() {
    const trpcContext = trpc.useContext();
    const { data: professors } = useDbValues("professors");
    const { mutateAsync: removeRatingMutation } = trpc.useMutation("removeRating");

    const [removedRatings, setRemovedRatings] = useState(new Set<string>());

    const ratings =
        professors
            ?.flatMap((professor) =>
                Object.values(professor.reviews ?? [])
                    .flat()
                    .map((review) => ({
                        professorId: professor.id,
                        professorName: `${professor.lastName}, ${professor.firstName}`,
                        ...review,
                    })),
            )
            .filter(({ id }) => !removedRatings.has(id))
            .sort(
                (reviewA, reviewB) => Date.parse(reviewB.postDate) - Date.parse(reviewA.postDate),
            ) ?? [];

    const removeRating = async (professorId: string, ratingId: string) => {
        await removeRatingMutation({ ratingId, professorId });
        setRemovedRatings(new Set<string>(...removedRatings).add(ratingId));
    };

    useEffect(
        () => () => {
            if (removedRatings.size) {
                // Invalidate to allow refetch if ratings have been deleted
                trpcContext.queryClient.invalidateQueries(bulkInvalidationKey("professors"));
            }
        },
        [],
    );

    type ConnectedRating = typeof ratings[0];
    const columns = [
        {
            name: "Professor",
            selector: (row: ConnectedRating) => row.professorName,
            grow: 0.5,
        },
        {
            name: "Date",
            selector: (row: ConnectedRating) => new Date(row.postDate).toLocaleDateString(),
            grow: 0.5,
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: ConnectedRating) => row.rating,
        },
        {
            name: "Remove",
            cell: (row: ConnectedRating) => (
                <ConfirmationButton
                    action={() => removeRating(row.professorId, row.id)}
                    buttonClassName="p-2 bg-red-500 text-white rounded"
                    buttonText="X"
                />
            ),
            center: true,
            grow: 0,
        },
    ];

    return (
        <div className="mt-4">
            <h2 className="ml-1">Recent Reviews:</h2>
            <DataTable columns={columns} data={ratings} pagination />
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
