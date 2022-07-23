/* eslint-disable react/no-unstable-nested-components */
import { Fragment, lazy, Suspense, useState } from "react";
import { Professor, RatingReport } from "@backend/types/schema";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { useDbValues } from "@/hooks/useDbValues";

const DataTableLazy = lazy(() => import("react-data-table-component"));
// TODO: If more lazy loading is needed, refactor into generic lazy load component
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
                {/* <RecentReviews /> */}
            </div>
        </div>
    ) : (
        <div>In order to use the admin panel you must be authenticated</div>
    );
}

function ReportedReviews() {
    const ratingReports = useDbValues("reports");
    const professors = ratingReports?.map(
        (rating) => trpc.useQuery(["getProfessor", rating.professorId]).data,
    );
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
            <DataTable columns={columns} data={ratingReports} pagination />
        </div>
    );
}

function PendingProfessors() {
    const pendingProfessors = useDbValues("professor-queue");
    const trpcContext = trpc.useContext();
    const { mutate: approvePendingProfessor } = trpc.useMutation("approvePendingTeacher", {
        // TODO: Fix invalidation
        onSuccess: () => trpcContext.invalidateQueries("getBulkKeys"),
    });
    const { mutate: rejectPendingProfessor } = trpc.useMutation("rejectPendingProfessor", {
        // TODO: Fix invalidation
        onSuccess: () => trpcContext.invalidateQueries("getBulkKeys"),
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
            <DataTable columns={columns} data={pendingProfessors} pagination />
        </div>
    );
}

function ProcessedReviews() {
    const processedReviews = useDbValues("rating-queue");
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
                    {Object.entries(row.sentimentResponse?.summaryScore ?? {}).map(
                        ([name, score]) => (
                            <div key={name}>
                                {name}: {score}
                            </div>
                        ),
                    )}
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
            <DataTable columns={columns} data={processedReviews} pagination />
        </div>
    );
}

// TODO: Re-Enable in a reasonable way
// function RecentReviews() {
//     const adminService = useService(AdminService);
//     const [recentReviews, setRecentReviews] = useState([] as ConnectedReview[]);
//     const [retrievalTime, setRetrievalTime] = useState("");

//     useEffect(() => {
//         async function retrieveData() {
//             const reviews = await adminService.recentReviews();
//             setRecentReviews(reviews);
//             const lastRetrieved = await adminService.professorKvDumpUpdatedAt();
//             setRetrievalTime(lastRetrieved);
//         }
//         retrieveData();
//     }, []);
//     const columns = [
//         {
//             name: "Professor",
//             selector: (row: ConnectedReview) => row.professorName,
//             grow: 0.5,
//         },
//         {
//             name: "Date",
//             selector: (row: ConnectedReview) => new Date(row.postDate).toLocaleDateString(),
//             grow: 0.5,
//         },
//         {
//             name: "Rating",
//             wrap: true,
//             grow: 3,
//             selector: (row: ConnectedReview) => row.rating,
//         },
//         {
//             name: "Remove",
//             cell: (row: ConnectedReview) => (
//                 <ConfirmationButton
//                     action={async () => {
//                         const reviewsLeft = await adminService.removeReview(
//                             row.professorId,
//                             row.id,
//                         );
//                         setRecentReviews(reviewsLeft);
//                     }}
//                     buttonClassName="p-2 bg-red-500 text-white rounded"
//                     buttonText="X"
//                 />
//             ),
//             center: true,
//             grow: 0,
//         },
//     ];

//     return (
//         <div className="mt-4">
//             <h2 className="ml-1">Recent Reviews:</h2>
//             <p className="text-sm ml-1">Data last retrieved at: {retrievalTime}</p>
//             <DataTable columns={columns} data={recentReviews} pagination />
//         </div>
//     );
// }

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
