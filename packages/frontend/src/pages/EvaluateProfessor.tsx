import { Navigate, useLoaderData, useParams } from "react-router";
import { PageMeta, ReviewForm, ReviewFormPageLayout } from "@/components";
import { trpc } from "@/trpc";
import { Spinner } from "@/components/ui/spinner";
import { NotFound } from "./NotFound";

type ProfessorPageLoaderData = { notFound: true } | { notFound: false };

export function EvaluateProfessorRoute() {
    const loaderData = useLoaderData() as ProfessorPageLoaderData;

    if (loaderData.notFound) {
        return <NotFound variant="professor" />;
    }

    return <EvaluateProfessorPage />;
}

function EvaluateProfessorPage() {
    const { id } = useParams<{ id: string }>();
    const professorId = id ?? "";
    const backLink = {
        href: `/professor/${professorId}`,
        label: "Back to professor",
    };
    const { data: professor, isLoading } = trpc.professors.get.useQuery({ id: professorId });

    if (isLoading && !professor) {
        return (
            <ReviewFormPageLayout title="Evaluate Professor" backLink={backLink}>
                <div className="flex justify-center py-10">
                    <Spinner className="size-8 text-brand" />
                </div>
            </ReviewFormPageLayout>
        );
    }

    if (!professor) {
        return <NotFound variant="professor" />;
    }

    if (professor.locked) {
        return <Navigate to={`/professor/${professor.id}`} replace />;
    }

    return (
        <>
            <PageMeta
                title={`Evaluate ${professor.lastName}, ${professor.firstName}`}
                description={`Submit a rating for ${professor.firstName} ${professor.lastName} at Cal Poly.`}
                path={`/professor/${professor.id}/eval`}
                noindex
            />
            <ReviewFormPageLayout
                title={`Evaluate ${professor.lastName}, ${professor.firstName}`}
                backLink={backLink}
            >
                <ReviewForm mode="evaluate" professor={professor} />
            </ReviewFormPageLayout>
        </>
    );
}
