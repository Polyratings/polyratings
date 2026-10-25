import { z } from "zod";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@backend/index";
// Resolve at runtime through the workspace link (not the "@backend/..." tsconfig alias,
// which tsx only erases for type-only imports).
import {
    COURSE_TYPES,
    DEPARTMENT_LIST,
    GRADE_LEVELS,
    GRADES,
    type Department,
} from "@polyratings/backend/src/utils/const";

export { COURSE_TYPES, DEPARTMENT_LIST, GRADE_LEVELS, GRADES };
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
        // Every word must match the first or last name, so "John Smith" and
        // "Smith, John" both find the same professor.
        const terms = input.search
            .toLowerCase()
            .split(/[\s,]+/)
            .filter(Boolean);
        result = result.filter((prof) => {
            const names = [prof.firstName, prof.lastName].map((name) => name.toLowerCase());
            return terms.every((term) => names.some((name) => name.includes(term)));
        });
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

function unwrapBulkEntry(entry: unknown): unknown {
    if (entry && typeof entry === "object" && "value" in entry) {
        return (entry as { value: unknown }).value;
    }
    return entry;
}

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
        .map((entry) => reportEntrySchema.safeParse(unwrapBulkEntry(entry)))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []));

    if (reports.length === 0) return [];

    const uniqueProfessorIds = [...new Set(reports.map((r) => r.professorId))];
    const { professors } = await client.admin.getProfessors.query({ ids: uniqueProfessorIds });
    const professorById = new Map(
        professors
            .filter((p): p is typeof p & { id: string } => typeof p?.id === "string")
            .map((p) => [p.id, p] as const),
    );

    const foundByRatingId = new Map(
        reports.map((report) => {
            const professor = professorById.get(report.professorId);
            return [
                report.ratingId,
                professor ? findRatingInProfessor(professor, report.ratingId) : null,
            ] as const;
        }),
    );

    // The rating log is only a fallback for ratings whose live copy lacks an author id.
    // It is optional context, so a legacy entry that fails to parse must not sink the list.
    const missingAnonIds = reports
        .map((r) => r.ratingId)
        .filter((ratingId) => !foundByRatingId.get(ratingId)?.rating.anonymousIdentifier);
    const anonByRatingId = new Map<string, string>();
    if (missingAnonIds.length > 0) {
        try {
            const ratingLogEntries = await client.admin.getBulkValues.mutate({
                bulkKey: "rating-log",
                keys: missingAnonIds,
            });
            for (const entry of ratingLogEntries) {
                const parsed = ratingEntrySchema.safeParse(unwrapBulkEntry(entry));
                if (parsed.success && parsed.data.anonymousIdentifier) {
                    anonByRatingId.set(parsed.data.id, parsed.data.anonymousIdentifier);
                }
            }
        } catch {
            // Leave ratingBy null for these rather than failing the whole queue.
        }
    }

    return reports.map((report) => {
        const professor = professorById.get(report.professorId) ?? null;
        const found = foundByRatingId.get(report.ratingId) ?? null;
        return {
            ratingId: report.ratingId,
            professorId: report.professorId,
            professorName: professor
                ? `${String(professor.lastName ?? "")}, ${String(professor.firstName ?? "")}`
                : null,
            professorDepartment: professor ? (professor.department ?? null) : null,
            rating: found?.rating.rating ?? null,
            ratingCourse: found?.course ?? null,
            ratingBy:
                found?.rating.anonymousIdentifier ?? anonByRatingId.get(report.ratingId) ?? null,
            ratingOverall: found?.rating.overallRating ?? null,
            ratingPresentsMaterialClearly: found?.rating.presentsMaterialClearly ?? null,
            ratingRecognizesStudentDifficulties:
                found?.rating.recognizesStudentDifficulties ?? null,
            reports: report.reports,
        };
    });
}

// ---------------------------------------------------------------------------
// Submit-pending-under-existing (same endpoint as the admin UI)
// ---------------------------------------------------------------------------

export interface SubmitPendingUnderExistingResult {
    pendingProfessorId: string;
    destProfessorId: string;
    destProfessorName: string;
    submitted: number;
    message: string;
}

// Calls admin.submitPendingUnderProfessor, which copies every pending review onto the
// live professor in one write (keeping ids, post dates and anonymousIdentifiers) and
// then removes the pending row. It skips ratings already copied, so a retry is safe.
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

    await client.admin.submitPendingUnderProfessor.mutate({
        destId: input.destProfessorId,
        sourceId: input.pendingProfessorId,
    });

    const submitted = Object.values(pending.reviews).flat().length;
    return {
        pendingProfessorId: input.pendingProfessorId,
        destProfessorId: input.destProfessorId,
        destProfessorName: `${dest.lastName}, ${dest.firstName}`,
        submitted,
        message: `${submitted} review(s) moved under the existing professor; pending row removed.`,
    };
}
