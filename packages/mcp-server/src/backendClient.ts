import { z } from "zod";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@backend/index";

export const BULK_KEYS = ["professor-queue", "professors", "rating-log", "reports"] as const;
export type BulkKey = (typeof BULK_KEYS)[number];
const MAX_BULK_VALUE_KEYS = 100;

const envSchema = z.object({
    POLYRATINGS_BACKEND_URL: z.string().url(),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;
function getEnv() {
    if (!cachedEnv) {
        cachedEnv = envSchema.parse({
            POLYRATINGS_BACKEND_URL: process.env.POLYRATINGS_BACKEND_URL,
        });
    }
    return cachedEnv;
}

let publicClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;
function getPublicClient() {
    if (!publicClient) {
        const { POLYRATINGS_BACKEND_URL } = getEnv();
        publicClient = createTRPCProxyClient<AppRouter>({
            links: [httpLink({ url: POLYRATINGS_BACKEND_URL })],
        });
    }
    return publicClient;
}

function createAdminClient(authToken: string) {
    const { POLYRATINGS_BACKEND_URL } = getEnv();
    return createTRPCProxyClient<AppRouter>({
        links: [
            httpLink({
                url: POLYRATINGS_BACKEND_URL,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            }),
        ],
    });
}

export interface ListProfessorsInput {
    search?: string;
    department?: string;
    limit?: number;
    offset?: number;
}

export interface ListReportedRatingsInput {
    limit?: number;
    offset?: number;
}

export async function listProfessors(input: ListProfessorsInput = {}) {
    const client = getPublicClient();
    const all = await client.professors.all.query();

    let result = all;

    if (input.search) {
        const searchLower = input.search.toLowerCase();
        result = result.filter((prof) =>
            `${prof.lastName} ${prof.firstName}`.toLowerCase().includes(searchLower),
        );
    }

    if (input.department) {
        result = result.filter((prof) => prof.department === input.department);
    }

    const offset = input.offset ?? 0;
    const limit = input.limit ?? 50;
    return result.slice(offset, offset + limit).map((prof) => ({
        id: prof.id,
        name: `${prof.lastName}, ${prof.firstName}`,
        department: prof.department,
        overallRating: typeof prof.overallRating === "number" ? prof.overallRating : null,
    }));
}

export async function getProfessor(id: string) {
    const client = getPublicClient();
    return client.professors.get.query({ id });
}

export async function getProfessors(ids: string[]) {
    const client = getPublicClient();
    return client.professors.getMany.query({ ids });
}

export async function getPendingProfessors(authToken: string) {
    const client = createAdminClient(authToken);
    return client.admin.getPendingProfessors.query();
}

export async function removeRatingsBulk(
    authToken: string,
    input: { professorId: string; ratingIds: string[]; reason: string },
): Promise<void> {
    const client = createAdminClient(authToken);
    await client.admin.removeRatingsBulk.mutate(input);
}

export async function getBulkKeys(authToken: string, bulkKey: BulkKey) {
    const client = createAdminClient(authToken);
    return client.admin.getBulkKeys.query(bulkKey);
}

export async function getBulkValues(
    authToken: string,
    bulkKey: BulkKey,
    keys: string[],
): Promise<unknown[]> {
    if (keys.length > MAX_BULK_VALUE_KEYS) {
        throw new Error(`Too many keys requested. Maximum is ${MAX_BULK_VALUE_KEYS}.`);
    }
    const client = createAdminClient(authToken);
    return client.admin.getBulkValues.mutate({ bulkKey, keys });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

type RatingWithCourse = {
    id: string;
    rating: string;
    anonymousIdentifier?: string;
    course: string;
    overallRating?: number;
    presentsMaterialClearly?: number;
    recognizesStudentDifficulties?: number;
};

function getRatingFromProfessor(
    professor: Record<string, unknown>,
    ratingId: string,
): RatingWithCourse | null {
    const { reviews } = professor;
    if (!isRecord(reviews)) {
        return null;
    }

    const match = Object.entries(reviews)
        .flatMap(([course, ratings]) =>
            Array.isArray(ratings) ? ratings.map((rating) => ({ course, rating })) : [],
        )
        .find(
            ({ rating }) =>
                isRecord(rating) && typeof rating.id === "string" && rating.id === ratingId,
        );

    if (!match || !isRecord(match.rating)) {
        return null;
    }

    return {
        id: ratingId,
        rating: typeof match.rating.rating === "string" ? match.rating.rating : "",
        anonymousIdentifier:
            typeof match.rating.anonymousIdentifier === "string"
                ? match.rating.anonymousIdentifier
                : undefined,
        course: match.course,
        overallRating:
            typeof match.rating.overallRating === "number" ? match.rating.overallRating : undefined,
        presentsMaterialClearly:
            typeof match.rating.presentsMaterialClearly === "number"
                ? match.rating.presentsMaterialClearly
                : undefined,
        recognizesStudentDifficulties:
            typeof match.rating.recognizesStudentDifficulties === "number"
                ? match.rating.recognizesStudentDifficulties
                : undefined,
    };
}

export async function listReportedRatings(
    authToken: string,
    input: ListReportedRatingsInput = {},
): Promise<unknown[]> {
    const reportKeys = await getBulkKeys(authToken, "reports");
    if (reportKeys.length === 0) {
        return [];
    }

    const offset = input.offset ?? 0;
    const rawLimit = input.limit ?? 50;
    const limit = Math.min(rawLimit, MAX_BULK_VALUE_KEYS);
    const pagedKeys = reportKeys.slice(offset, offset + limit);

    if (pagedKeys.length === 0) {
        return [];
    }

    const reportValues = await getBulkValues(authToken, "reports", pagedKeys);

    const reports = reportValues
        .filter(isRecord)
        .filter(
            (value) =>
                typeof value.professorId === "string" &&
                typeof value.ratingId === "string" &&
                Array.isArray(value.reports),
        ) as {
        professorId: string;
        ratingId: string;
        reports: unknown[];
    }[];

    if (reports.length === 0) {
        return [];
    }

    const uniqueProfessorIds = [...new Set(reports.map((report) => report.professorId))];
    const professors = (await getProfessors(uniqueProfessorIds))
        .filter(isRecord)
        .filter((value) => typeof value.id === "string");

    const professorById = new Map(professors.map((professor) => [String(professor.id), professor]));

    const enriched = reports.map((report) => {
        const professor = professorById.get(report.professorId);
        const ratingDetails = professor ? getRatingFromProfessor(professor, report.ratingId) : null;

        return {
            ratingId: report.ratingId,
            professorId: report.professorId,
            professorName: professor
                ? `${String(professor.lastName ?? "")}, ${String(professor.firstName ?? "")}`
                : null,
            professorDepartment: professor ? (professor.department ?? null) : null,
            rating: ratingDetails?.rating ?? null,
            ratingCourse: ratingDetails?.course ?? null,
            ratingBy: ratingDetails?.anonymousIdentifier ?? null,
            ratingOverall: ratingDetails?.overallRating ?? null,
            ratingPresentsMaterialClearly: ratingDetails?.presentsMaterialClearly ?? null,
            ratingRecognizesStudentDifficulties:
                ratingDetails?.recognizesStudentDifficulties ?? null,
            reports: report.reports,
        };
    });

    return enriched;
}

export async function getProfessorRatingsByAnonymousIdentifier(
    authToken: string,
    professorId: string,
    anonymousIdentifier: string,
): Promise<unknown[]> {
    const client = createAdminClient(authToken);
    return client.admin.getRatingsByAnonymousIdentifier.query({
        professorId,
        anonymousIdentifier,
    });
}

export async function keepReportedRating(authToken: string, ratingId: string): Promise<void> {
    const client = createAdminClient(authToken);
    await client.admin.removeReport.mutate(ratingId);
}

export async function removeReportedRating(authToken: string, ratingId: string): Promise<void> {
    const client = createAdminClient(authToken);
    await client.admin.actOnReport.mutate(ratingId);
}
