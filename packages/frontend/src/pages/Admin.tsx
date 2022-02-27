import DataTable from "react-data-table-component";
import { useEffect, useState } from "react";
import { Teacher } from "@polyratings/shared";
import { useService } from "@/hooks";
import { AdminService, ConnectedReview } from "@/services";

export function Admin() {
    return (
        <div>
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <PendingProfessors />
                <RecentReviews />
            </div>
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
            name: "Rating Class",
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
            // eslint-disable-next-line react/no-unstable-nested-components
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
            // eslint-disable-next-line react/no-unstable-nested-components
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
            // eslint-disable-next-line react/no-unstable-nested-components
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
