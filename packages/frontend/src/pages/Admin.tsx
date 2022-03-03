/* eslint-disable react/no-unstable-nested-components */
import DataTable from "react-data-table-component";
import { Fragment, useEffect, useState } from "react";
import { Teacher } from "@polyratings/shared";
import { useAuth, useService } from "@/hooks";
import { AdminService, ConnectedReview, JoinedRatingReport } from "@/services";

export function Admin() {
    const authenticated = useAuth();
    return authenticated ? (
        <div>
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <ReportedReviews />
                <PendingProfessors />
                <RecentReviews />
            </div>
        </div>
    ) : (
        <div>In order to use the admin panel you must be authenticated</div>
    );
}

function ReportedReviews() {
    const adminService = useService(AdminService);
    const [reportedRatings, setReportedRatings] = useState([] as JoinedRatingReport[]);

    useEffect(() => {
        async function retrieveData() {
            const reports = await adminService.getReports();
            setReportedRatings(reports);
        }
        retrieveData();
    }, []);

    const columns = [
        {
            name: "Professor",
            grow: 0.5,
            selector: (row: JoinedRatingReport) =>
                `${row.professor.lastName}, ${row.professor.firstName}`,
        },
        {
            name: "Department",
            grow: 0.5,
            selector: (row: JoinedRatingReport) => row.professor.department,
        },
        {
            name: "Rating Course",
            grow: 0.5,
            selector: (row: JoinedRatingReport) => row.courseName,
        },
        {
            name: "Reason",
            wrap: true,
            grow: 1.5,
            cell: (row: JoinedRatingReport) => (
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
            selector: (row: JoinedRatingReport) => row.review.rating,
        },
        {
            name: "Keep Rating",
            cell: (row: JoinedRatingReport) => (
                <ConfirmationButton
                    action={async () => {
                        const reports = await adminService.removeReport(row.ratingId);
                        setReportedRatings(reports);
                    }}
                    buttonClassName="p-2 bg-green-500 text-white rounded"
                    buttonText="K"
                />
            ),
            center: true,
            grow: 0,
        },
        {
            name: "Remove Rating",
            cell: (row: JoinedRatingReport) => (
                <ConfirmationButton
                    action={async () => {
                        const reports = await adminService.actOnReport(row.ratingId);
                        setReportedRatings(reports);
                    }}
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
            <DataTable columns={columns} data={reportedRatings} pagination />
        </div>
    );
}

function PendingProfessors() {
    const adminService = useService(AdminService);
    const [pendingProfessors, setPendingProfessors] = useState([] as Teacher[]);

    useEffect(() => {
        async function retrieveData() {
            const professors = await adminService.pendingProfessors();
            setPendingProfessors(professors);
        }
        retrieveData();
    }, []);

    const columns = [
        {
            name: "Professor",
            selector: (row: Teacher) => `${row.lastName}, ${row.firstName}`,
        },
        {
            name: "Department",
            selector: (row: Teacher) => row.department,
        },
        {
            name: "Rating Course",
            selector: (row: Teacher) => Object.keys(row.reviews ?? {})[0],
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: Teacher) => Object.values(row.reviews ?? {})[0][0].rating,
        },
        {
            name: "Approve",
            cell: (row: Teacher) => (
                <ConfirmationButton
                    action={async () => {
                        const afterApproval = await adminService.approvePendingProfessor(row.id);
                        setPendingProfessors(afterApproval);
                    }}
                    buttonClassName="p-2 bg-green-500 text-white rounded"
                    buttonText="✓"
                />
            ),
            center: true,
            grow: 0,
        },
        {
            name: "Deny",
            cell: (row: Teacher) => (
                <ConfirmationButton
                    action={async () => {
                        const afterRemoval = await adminService.removePendingProfessor(row.id);
                        setPendingProfessors(afterRemoval);
                    }}
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

function RecentReviews() {
    const adminService = useService(AdminService);
    const [recentReviews, setRecentReviews] = useState([] as ConnectedReview[]);
    const [retrievalTime, setRetrievalTime] = useState("");

    useEffect(() => {
        async function retrieveData() {
            const reviews = await adminService.recentReviews();
            setRecentReviews(reviews);
            const lastRetrieved = await adminService.professorKvDumpUpdatedAt();
            setRetrievalTime(lastRetrieved);
        }
        retrieveData();
    }, []);
    const columns = [
        {
            name: "Professor",
            selector: (row: ConnectedReview) => row.professorName,
        },
        {
            name: "Rating",
            wrap: true,
            grow: 3,
            selector: (row: ConnectedReview) => row.rating,
        },
        {
            name: "Remove",
            cell: (row: ConnectedReview) => (
                <ConfirmationButton
                    action={async () => {
                        const reviewsLeft = await adminService.removeReview(
                            row.professorId,
                            row.id,
                        );
                        setRecentReviews(reviewsLeft);
                    }}
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
            <p className="text-sm ml-1">Data last retrieved at: {retrievalTime}</p>
            <DataTable columns={columns} data={recentReviews} pagination />
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
