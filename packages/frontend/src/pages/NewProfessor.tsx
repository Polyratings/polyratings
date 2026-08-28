import { PageMeta, ReviewForm, ReviewFormPageLayout } from "@/components";

export function NewProfessor() {
    return (
        <>
            <PageMeta
                title="Add a Professor"
                description="Add a Cal Poly professor to Polyratings and write the first student review."
                path="/new-professor"
                noindex
            />
            <ReviewFormPageLayout title="Add a Professor">
                <ReviewForm mode="new-professor" />
            </ReviewFormPageLayout>
        </>
    );
}
