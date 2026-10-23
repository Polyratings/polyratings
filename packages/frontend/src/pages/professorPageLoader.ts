import type { LoaderFunction } from "react-router";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/trpc";

const UUID_RE =
    /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;

export type ProfessorPageLoaderData = { notFound: true } | { notFound: false };

function isProfessorNotFoundError(error: unknown): boolean {
    return error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
}

export function professorPageLoaderFactory(trpcContext: ReturnType<(typeof trpc)["useUtils"]>) {
    const professorPageLoader: LoaderFunction = async ({ params }) => {
        const id = params.id ?? "";

        if (!UUID_RE.test(id)) {
            return { notFound: true } satisfies ProfessorPageLoaderData;
        }

        try {
            await (trpcContext.professors.get.getData({ id }) ??
                trpcContext.professors.get.fetch(
                    { id },
                    { meta: { suppressGlobalErrorToast: true } },
                ));
            return { notFound: false } satisfies ProfessorPageLoaderData;
        } catch (error) {
            if (isProfessorNotFoundError(error)) {
                return { notFound: true } satisfies ProfessorPageLoaderData;
            }
            throw error;
        }
    };

    return professorPageLoader;
}
