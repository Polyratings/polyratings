import { Navigate } from "react-router";
import { PageMeta, StaticPageHeader } from "@/components";
import { useAuth } from "@/hooks";
import { PendingProfessors, ProcessedRatings, ReportedRatings } from "@/pages/admin";

export function Admin() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return (
        <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 py-8 outline-none md:py-16"
        >
            <PageMeta title="Admin" description="Polyratings admin tools." path="/admin" noindex />
            <StaticPageHeader>Admin</StaticPageHeader>
            <div className="space-y-0">
                <PendingProfessors />
                <ReportedRatings />
                <ProcessedRatings />
            </div>
        </main>
    );
}
