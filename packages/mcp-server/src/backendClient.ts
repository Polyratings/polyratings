import { z } from "zod";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@backend/index";
// Resolve at runtime through the workspace link (not the "@backend/..." tsconfig alias,
// which tsx only erases for type-only imports).
import { DEPARTMENT_LIST, type Department } from "@polyratings/backend/src/utils/const";

export { DEPARTMENT_LIST };
export type { Department };

export const BULK_KEYS = ["professor-queue", "professors", "rating-log", "reports"] as const;
export type BulkKey = (typeof BULK_KEYS)[number];
export const MAX_BULK_VALUE_KEYS = 100;

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

export type PolyratingsClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

let publicClient: PolyratingsClient | null = null;
export function getPublicClient(): PolyratingsClient {
    if (!publicClient) {
        const { POLYRATINGS_BACKEND_URL } = getEnv();
        publicClient = createTRPCProxyClient<AppRouter>({
            links: [httpLink({ url: POLYRATINGS_BACKEND_URL })],
        });
    }
    return publicClient;
}

const adminClientCache = new Map<string, PolyratingsClient>();
export function getAdminClient(authToken: string): PolyratingsClient {
    const cached = adminClientCache.get(authToken);
    if (cached) return cached;
    const { POLYRATINGS_BACKEND_URL } = getEnv();
    const client = createTRPCProxyClient<AppRouter>({
        links: [
            httpLink({
                url: POLYRATINGS_BACKEND_URL,
                headers: { authorization: `Bearer ${authToken}` },
            }),
        ],
    });
    adminClientCache.set(authToken, client);
    return client;
}

// ---------------------------------------------------------------------------
// Public-client helpers
// ---------------------------------------------------------------------------

export interface ListProfessorsInput {
    search?: string;
    department?: string;
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
    return getPublicClient().professors.get.query({ id });
}

export async function getProfessors(ids: string[]) {
    const { professors } = await getPublicClient().professors.getMany.query({ ids });
    return professors;
}

// ---------------------------------------------------------------------------
// Reported-ratings enrichment
// ---------------------------------------------------------------------------

export interface ListReportedRatingsInput {
    limit?: number;
    offset?: number;
}

const reportEntrySchema = z.object({
    professorId: z.string(),
    ratingId: z.string(),
    reports: z.array(z.unknown()),
});

const ratingEntrySchema = z
    .object({
        id: z.string(),
        rating: z.string().optional(),
        anonymousIdentifier: z.string().optional(),
        overallRating: z.number().optional(),
        presentsMaterialClearly: z.number().optional(),
        recognizesStudentDifficulties: z.number().optional(),
    })
    .passthrough();

function findRatingInProfessor(
    professor: { reviews?: Record<string, unknown[]> | null } | null | undefined,
    ratingId: string,
): { course: string; rating: z.infer<typeof ratingEntrySchema> } | null {
    const reviews = professor?.reviews ?? {};
    for (const [course, ratings] of Object.entries(reviews)) {
        if (!Array.isArray(ratings)) continue;
        for (const raw of ratings) {
            const parsed = ratingEntrySchema.safeParse(raw);
            if (parsed.success && parsed.data.id === ratingId) {
                return { course, rating: parsed.data };
            }
        }
    }
    return null;
}

export async function listReportedRatings(
    authToken: string,
    input: ListReportedRatingsInput = {},
): Promise<unknown[]> {
    const client = getAdminClient(authToken);
    const reportKeys = await client.admin.getBulkKeys.query("reports");
    if (reportKeys.length === 0) return [];

    const offset = input.offset ?? 0;
    const limit = Math.min(input.limit ?? 50, MAX_BULK_VALUE_KEYS);
    const pagedKeys = reportKeys.slice(offset, offset + limit);
    if (pagedKeys.length === 0) return [];

    const reportValues = await client.admin.getBulkValues.mutate({
        bulkKey: "reports",
        keys: pagedKeys,
    });
    const reports = reportValues
        .map((value) => reportEntrySchema.safeParse(value))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []));

    if (reports.length === 0) return [];

    const uniqueProfessorIds = [...new Set(reports.map((r) => r.professorId))];
    const professors = await getProfessors(uniqueProfessorIds);
    const professorById = new Map(
        professors
            .filter((p): p is typeof p & { id: string } => typeof p?.id === "string")
            .map((p) => [p.id, p] as const),
    );

    return reports.map((report) => {
        const professor = professorById.get(report.professorId) ?? null;
        const found = professor ? findRatingInProfessor(professor, report.ratingId) : null;
        return {
            ratingId: report.ratingId,
            professorId: report.professorId,
            professorName: professor
                ? `${String(professor.lastName ?? "")}, ${String(professor.firstName ?? "")}`
                : null,
            professorDepartment: professor ? (professor.department ?? null) : null,
            rating: found?.rating.rating ?? null,
            ratingCourse: found?.course ?? null,
            ratingBy: found?.rating.anonymousIdentifier ?? null,
            ratingOverall: found?.rating.overallRating ?? null,
            ratingPresentsMaterialClearly: found?.rating.presentsMaterialClearly ?? null,
            ratingRecognizesStudentDifficulties:
                found?.rating.recognizesStudentDifficulties ?? null,
            reports: report.reports,
        };
    });
}

// ---------------------------------------------------------------------------
// Submit-pending-under-existing (mirrors admin UI flow)
// ---------------------------------------------------------------------------

export interface SubmitPendingUnderExistingResult {
    pendingProfessorId: string;
    destProfessorId: string;
    destProfessorName: string;
    attempted: number;
    submitted: number;
    failures: Array<{ course: string; ratingId: string; error: string }>;
    pendingRemoved: boolean;
    message: string;
}

type SubmitTask =
    | { kind: "submit"; course: string; ratingId: string; body: Record<string, unknown> }
    | { kind: "malformed"; course: string; ratingId: string };

type FailureEntry = { course: string; ratingId: string; error: string };

const pendingRatingSchema = z.object({ id: z.string() }).passthrough();

function extractRatingId(rating: unknown): string {
    const parsed = pendingRatingSchema.safeParse(rating);
    return parsed.success ? parsed.data.id : "unknown";
}

function buildSubmitTasks(
    reviews: Record<string, unknown[]>,
    destProfessorId: string,
): SubmitTask[] {
    return Object.entries(reviews).flatMap(([course, ratings]): SubmitTask[] => {
        if (!Array.isArray(ratings) || ratings.length === 0) return [];
        const [dep, num] = course.split(" ");
        const courseNum = Number.parseFloat(num ?? "");
        if (!dep || Number.isNaN(courseNum)) {
            return ratings.map(
                (rating): SubmitTask => ({
                    kind: "malformed",
                    course,
                    ratingId: extractRatingId(rating),
                }),
            );
        }
        return ratings.map((rating): SubmitTask => {
            const parsed = pendingRatingSchema.safeParse(rating);
            const base = parsed.success ? parsed.data : {};
            return {
                kind: "submit",
                course,
                ratingId: parsed.success ? parsed.data.id : "unknown",
                body: { ...base, professor: destProfessorId, department: dep, courseNum },
            };
        });
    });
}

function summarize(submitted: number, failures: number, pendingRemoved: boolean): string {
    if (pendingRemoved) {
        return `All ${submitted} review(s) re-submitted under existing professor; pending row removed.`;
    }
    if (failures > 0) {
        return (
            `${submitted} review(s) re-submitted, ${failures} failed. Pending row left in ` +
            "place — inspect failures and retry, or fall back to approve + merge."
        );
    }
    return "No reviews found on pending row; nothing to submit and pending row left untouched.";
}

// Mirrors the admin UI's "Submit under [existing prof]" flow on a pending-professor row:
//   1) submit every attached review to the public `ratings.add` mutation targeting the
//      destination live professor (re-runs moderation + rate limiter),
//   2) if and only if every review was accepted, reject/remove the pending row.
// If any review fails (moderation, rate limit, duplicate-text guard, etc.) the pending
// row is left in place so the moderator can retry or fall back to approve + merge.
export async function submitPendingUnderExisting(
    authToken: string,
    input: { pendingProfessorId: string; destProfessorId: string },
): Promise<SubmitPendingUnderExistingResult> {
    const client = getAdminClient(authToken);

    const pendingList = await client.admin.getPendingProfessors.query();
    const pending = pendingList.find((p) => p.id === input.pendingProfessorId);
    if (!pending) {
        throw new Error(
            `Pending professor ${input.pendingProfessorId} not found in the pending queue.`,
        );
    }

    const dest = await client.professors.get.query({ id: input.destProfessorId });
    if (!dest) {
        throw new Error(`Destination professor ${input.destProfessorId} not found.`);
    }

    const reviews = (pending.reviews ?? {}) as Record<string, unknown[]>;
    const tasks = buildSubmitTasks(reviews, input.destProfessorId);

    // Sequential execution: `ratings.add` is rate-limited and enforces a duplicate-text
    // guard per professor, so parallelizing would trip both.
    const failures: FailureEntry[] = [];
    let submitted = 0;
    for (const task of tasks) {
        if (task.kind === "malformed") {
            failures.push({
                course: task.course,
                ratingId: task.ratingId,
                error: `Malformed course key "${task.course}" (expected "DEPT NUM").`,
            });
            continue;
        }
        try {
            await client.ratings.add.mutate(
                // ratings.add's zod schema strips extra fields; body shape is validated there.
                task.body as Parameters<typeof client.ratings.add.mutate>[0],
            );
            submitted += 1;
        } catch (err) {
            failures.push({
                course: task.course,
                ratingId: task.ratingId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    const attempted = tasks.length;
    const pendingRemoved = attempted > 0 && failures.length === 0;
    if (pendingRemoved) {
        await client.admin.rejectPendingProfessor.mutate(input.pendingProfessorId);
    }

    return {
        pendingProfessorId: input.pendingProfessorId,
        destProfessorId: input.destProfessorId,
        destProfessorName: `${String(dest.lastName ?? "")}, ${String(dest.firstName ?? "")}`,
        attempted,
        submitted,
        failures,
        pendingRemoved,
        message: summarize(submitted, failures.length, pendingRemoved),
    };
}
