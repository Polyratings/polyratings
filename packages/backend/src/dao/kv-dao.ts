import { ALL_PROFESSOR_KEY, BulkKey, BulkKeyMap } from "@backend/utils/const";
import { courseReviewsKey, isCourseKey } from "@backend/utils/courseNum";
import { mapInBatches } from "@backend/utils/chunkArray";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
    coursesFromReviews,
    PendingRating,
    pendingRatingParser,
    Professor,
    professorParser,
    professorWriteParser,
    RatingReport,
    ratingReportParser,
    TruncatedProfessor,
    truncatedProfessorParser,
    truncatedProfessorWriteParser,
    User,
    userParser,
} from "@backend/types/schema";
import {
    addRating as addRatingToProfessor,
    coursesNeedSync,
    patchProfessorListCourses,
    professorToTruncatedProfessor,
    removeRating,
    removeRatingsBulk as removeRatingsBulkFromProfessor,
} from "@backend/types/schemaHelpers";
import { KvWrapper } from "./kv-wrapper";

const KV_REQUESTS_PER_TRIGGER = 1000;
const THREE_WEEKS_SECONDS = 60 * 60 * 24 * 7 * 3;

// Window size for bulk KV reads. Awaited before the next window starts.
const BULK_FETCH_CONCURRENCY = 50;

// Per-professor get→put pairs in flight during the courses backfill.
const COURSES_BACKFILL_CONCURRENCY = 10;
/** Most professors one list repair call fetches. Rerun to pick up the rest. */
export const LIST_REPAIR_MAX_PROFESSORS = 200;

/** Just enough of a stored professor to compare `courses` with its review keys. */
const storedCoursesParser = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    courses: z.string().array(),
    reviews: z.record(z.string(), z.unknown()),
});

export type CoursesChange = { id: string; name: string; before: string[]; after: string[] };

function displayName(professor: { firstName?: string; lastName?: string }) {
    return `${professor.lastName ?? "?"}, ${professor.firstName ?? "?"}`;
}

function errorSummary(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 300) : String(error);
}

export class KVDAO {
    constructor(
        private polyratingsNamespace: KvWrapper,
        private usersNamespace: KvWrapper,
        private ratingsLog: KvWrapper,
        private professorApprovalQueueNamespace: KvWrapper,
        private reportsNamespace: KvWrapper,
    ) {}

    async getAllProfessors() {
        const professorList = await this.polyratingsNamespace.safeGet(
            truncatedProfessorParser.array(),
            ALL_PROFESSOR_KEY,
        );
        if (!professorList.success) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not find any professors.",
            });
        }

        return professorList.data;
    }

    private async putAllProfessors(professorList: TruncatedProfessor[]) {
        await this.polyratingsNamespace.put(
            truncatedProfessorParser.array(),
            ALL_PROFESSOR_KEY,
            professorList,
        );
    }

    getProfessor(id: string) {
        return this.polyratingsNamespace.get(professorParser, id);
    }

    getProfessorOptional(id: string) {
        return this.polyratingsNamespace.getOptional(professorParser, id);
    }

    getBulkNamespace(bulkKey: BulkKey): { namespace: KvWrapper; parser: z.ZodType } {
        const namespaceMap: Record<BulkKey, { namespace: KvWrapper; parser: z.ZodType }> = {
            professors: { namespace: this.polyratingsNamespace, parser: professorParser },
            "professor-queue": {
                namespace: this.professorApprovalQueueNamespace,
                parser: professorParser,
            },
            users: { namespace: this.usersNamespace, parser: userParser },
            reports: { namespace: this.reportsNamespace, parser: ratingReportParser },
            "rating-log": {
                namespace: this.ratingsLog,
                parser: pendingRatingParser,
            },
        };

        return namespaceMap[bulkKey];
    }

    async getBulkKeys(bulkKey: BulkKey): Promise<string[]> {
        const { namespace } = this.getBulkNamespace(bulkKey);
        const keys: string[] = [];
        let cursor: string | undefined;
        do {
            const options: KVNamespaceListOptions = cursor ? { cursor } : {};

            // eslint-disable-next-line no-await-in-loop
            const result = await namespace.list(options);

            // Push all key names into the keys array
            keys.push(...result.keys.map((key) => key.name));

            // Update cursor based on list_complete value
            cursor = result.list_complete === false ? result.cursor : undefined;
        } while (cursor);

        // The professors namespace also stores the truncated search index under ALL_PROFESSOR_KEY.
        if (bulkKey === "professors") {
            return keys.filter((key) => key !== ALL_PROFESSOR_KEY);
        }

        return keys;
    }

    async getBulkValues<T extends BulkKey>(
        bulkKey: T,
        keys: string[],
    ): Promise<Array<{ key: string; value: BulkKeyMap[T][number] }>> {
        if (keys.length > KV_REQUESTS_PER_TRIGGER) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Can not process more than ${KV_REQUESTS_PER_TRIGGER} keys per request`,
            });
        }
        const { namespace, parser } = this.getBulkNamespace(bulkKey);
        const requestedKeys =
            bulkKey === "professors" ? keys.filter((key) => key !== ALL_PROFESSOR_KEY) : keys;

        const flatKeyValuePairs = await mapInBatches(
            requestedKeys,
            BULK_FETCH_CONCURRENCY,
            async (key) => {
                const value = await namespace.getUnsafe(key);
                return { key, value };
            },
        );

        const validatedResults: Array<{ key: string; value: BulkKeyMap[T][number] }> = [];
        const parseFailures: string[] = [];
        for (const { key, value } of flatKeyValuePairs) {
            if (value !== null && value !== undefined) {
                const parsed = parser.safeParse(value);
                if (parsed.success) {
                    validatedResults.push({ key, value: parsed.data as BulkKeyMap[T][number] });
                } else {
                    parseFailures.push(key);
                }
            }
        }

        if (parseFailures.length > 0) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to parse ${parseFailures.length} bulk value(s). First key: ${parseFailures[0]}`,
            });
        }

        return validatedResults;
    }

    async putProfessor(
        professor: Professor,
        options?: {
            skipNameCollisionDetection?: boolean;
        },
    ) {
        const skipNameCollisionDetection = options?.skipNameCollisionDetection ?? false;
        // Need to check if key exists in order to not throw an error when calling `getProfessor`
        if (
            !skipNameCollisionDetection &&
            (await this.polyratingsNamespace.getOptional(professorParser, professor.id))
        ) {
            const existingProfessor = await this.getProfessor(professor.id);
            if (
                existingProfessor.firstName !== professor.firstName ||
                existingProfessor.lastName !== professor.lastName
            ) {
                throw new Error("Possible professor collision detected");
            }
        }

        // Validate the list entry before either write, so a bad record never lands half-written.
        const truncatedProf = truncatedProfessorWriteParser.parse(
            professorToTruncatedProfessor(professor),
        );
        await this.polyratingsNamespace.put(professorWriteParser, professor.id, professor);

        const profList = await this.getAllProfessors();
        // Right now we have these because of the unfortunate shape of our professor list structure.
        // TODO: Investigate better structure for the professor list
        const professorIndex = profList.findIndex((t) => t.id === professor.id);

        if (professorIndex === -1) {
            profList.push(truncatedProf);
        } else {
            profList[professorIndex] = truncatedProf;
        }

        await this.putAllProfessors(profList);

        return professor;
    }

    /**
     * Rewrite stored professor records whose `courses` differs from their review keys, one KV
     * list page at a time. Reads already derive `courses`, so this only cleans stored data; it
     * never touches the all-professors list (see `repairProfessorListCourses`).
     *
     * Each professor is read and written back immediately (no batching of reads ahead of writes)
     * to keep the window in which a concurrent rating could be overwritten as short as possible.
     */
    async backfillProfessorCourses({
        cursor,
        limit,
        dryRun,
    }: {
        cursor?: string;
        limit: number;
        dryRun: boolean;
    }) {
        const page = await this.polyratingsNamespace.list(cursor ? { cursor, limit } : { limit });
        const keys = page.keys.map((key) => key.name).filter((key) => key !== ALL_PROFESSOR_KEY);

        const outcomes = await mapInBatches(keys, COURSES_BACKFILL_CONCURRENCY, async (key) => {
            const raw = await this.polyratingsNamespace.getUnsafe(key);
            const stored = storedCoursesParser.safeParse(raw);
            if (!stored.success) {
                return { problem: { id: key, error: "Stored value is not a professor" } };
            }
            if (!coursesNeedSync(stored.data)) {
                return {};
            }
            const change: CoursesChange = {
                id: key,
                name: displayName(stored.data),
                before: stored.data.courses,
                after: coursesFromReviews(stored.data),
            };
            if (dryRun) {
                return { change };
            }
            try {
                // The read parser derives `courses`; the write parser re-checks it.
                const professor = professorParser.parse(raw);
                await this.polyratingsNamespace.put(professorWriteParser, key, professor);
                return { change };
            } catch (error) {
                return { problem: { id: key, error: errorSummary(error) } };
            }
        });

        const changes = outcomes.flatMap((outcome) => (outcome.change ? [outcome.change] : []));
        const problems = outcomes.flatMap((outcome) => (outcome.problem ? [outcome.problem] : []));
        return {
            dryRun,
            scanned: keys.length,
            changes,
            problems,
            nextCursor: page.list_complete ? null : page.cursor,
        };
    }

    /**
     * Fix `courses` on all-professors list entries in one read-modify-write of the list.
     *
     * Candidates are entries holding something that is not a course key (the legacy `["BUS"]`
     * shape) plus any `ids` the caller passes. Their professors are fetched first; the list is
     * then re-read immediately before the single write and only `courses` is patched, so the
     * window for losing a concurrent list update is one get+put, as with `putProfessor`.
     */
    async repairProfessorListCourses({ dryRun, ids }: { dryRun: boolean; ids?: string[] }) {
        const list = await this.getAllProfessors();
        const candidateIds = new Set(ids ?? []);
        for (const entry of list) {
            if (entry.courses.some((course) => !isCourseKey(course))) {
                candidateIds.add(entry.id);
            }
        }
        const allCandidates = [...candidateIds];
        const batch = allCandidates.slice(0, LIST_REPAIR_MAX_PROFESSORS);

        const fetched = await mapInBatches(batch, BULK_FETCH_CONCURRENCY, async (id) => {
            const raw = await this.polyratingsNamespace.getUnsafe(id);
            if (raw === null || raw === undefined) {
                return { id, professorNotFound: true as const };
            }
            const parsed = professorParser.safeParse(raw);
            return parsed.success
                ? { id, courses: parsed.data.courses }
                : { id, problem: { id, error: "Stored professor failed to parse" } };
        });

        const coursesById = new Map(
            fetched.flatMap((result) => (result.courses ? [[result.id, result.courses]] : [])),
        );
        const professorNotFound = fetched.flatMap((r) => (r.professorNotFound ? [r.id] : []));
        const problems = fetched.flatMap((r) => (r.problem ? [r.problem] : []));

        // Dry run patches the list we already hold; a real run patches a fresh read.
        const target = dryRun ? list : await this.getAllProfessors();
        const beforeById = new Map(target.map((entry) => [entry.id, [...entry.courses]]));
        const { updatedIds, missingIds } = patchProfessorListCourses(target, coursesById);
        if (!dryRun && updatedIds.length > 0) {
            await this.putAllProfessors(target);
        }

        const entriesById = new Map(target.map((entry) => [entry.id, entry]));
        const changes: CoursesChange[] = updatedIds.map((id) => ({
            id,
            name: displayName(entriesById.get(id)!),
            before: beforeById.get(id) ?? [],
            after: entriesById.get(id)!.courses,
        }));

        return {
            dryRun,
            listSize: target.length,
            candidates: allCandidates.length,
            processed: batch.length,
            remaining: allCandidates.length - batch.length,
            changes,
            professorNotFound,
            listEntryMissing: missingIds,
            problems,
        };
    }

    async removeProfessor(id: string) {
        await this.polyratingsNamespace.delete(id);

        const profList = await this.getAllProfessors();
        const professorIndex = profList.findIndex((t) => t.id === id);

        if (professorIndex === -1) {
            throw new Error("Professor entity existed for removal but not in all professor list");
        }

        profList.splice(professorIndex, 1);
        await this.putAllProfessors(profList);
    }

    async addRatingLog(rating: PendingRating) {
        return this.ratingsLog.put(pendingRatingParser, rating.id, rating, {
            expirationTtl: THREE_WEEKS_SECONDS,
        });
    }

    async getRatingLog(ratingId: string): Promise<PendingRating | undefined> {
        return this.ratingsLog.getOptional(pendingRatingParser, ratingId);
    }

    async addRating(newRating: PendingRating) {
        if (newRating.status !== "Successful") {
            throw new Error("Cannot add rating to KV that has not been analyzed.");
        }

        const professor = await this.getProfessor(newRating.professor);
        addRatingToProfessor(
            professor,
            newRating,
            courseReviewsKey(newRating.department, newRating.courseNum),
        );

        return this.putProfessor(professor);
    }

    async removeRating(professorId: string, ratingId: string) {
        const professor = await this.getProfessor(professorId);
        return this.removeRatingWithProfessor(professor, ratingId);
    }

    /** Mutates the given professor snapshot and persists it (avoids a redundant KV read). */
    removeRatingWithProfessor(professor: Professor, ratingId: string) {
        removeRating(professor, ratingId);
        return this.putProfessor(professor);
    }

    async removeRatingsBulk(professor: Professor, ratingIds: string[]): Promise<number> {
        const removed = removeRatingsBulkFromProfessor(professor, ratingIds);
        await this.putProfessor(professor);
        return removed;
    }

    async getUser(username: string) {
        try {
            const user = await this.usersNamespace.get(userParser, username);
            return user;
        } catch {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
    }

    putUser(user: User) {
        return this.usersNamespace.put(userParser, user.username, user);
    }

    async putPendingProfessor(professor: Professor) {
        return this.professorApprovalQueueNamespace.put(
            professorWriteParser,
            professor.id,
            professor,
        );
    }

    async getPendingProfessor(id: string) {
        return this.professorApprovalQueueNamespace.get(professorParser, id);
    }

    getPendingProfessorOptional(id: string) {
        return this.professorApprovalQueueNamespace.getOptional(professorParser, id);
    }

    async getAllPendingProfessors() {
        return this.professorApprovalQueueNamespace.getAll(professorParser);
    }

    removePendingProfessor(id: string) {
        return this.professorApprovalQueueNamespace.delete(id);
    }

    async getReport(ratingId: string) {
        return this.reportsNamespace.get(ratingReportParser, ratingId);
    }

    getReportOptional(ratingId: string) {
        return this.reportsNamespace.getOptional(ratingReportParser, ratingId);
    }

    async putReport(report: RatingReport): Promise<void> {
        const existingReport = await this.reportsNamespace.getOptional(
            ratingReportParser,
            report.ratingId,
        );

        if (existingReport) {
            existingReport.reports = existingReport.reports.concat(report.reports);
            if (report.scheduleMatch) {
                existingReport.scheduleMatch = report.scheduleMatch;
            }
            await this.reportsNamespace.put(ratingReportParser, report.ratingId, existingReport);
        } else {
            await this.reportsNamespace.put(ratingReportParser, report.ratingId, report);
        }
    }

    async removeReport(ratingId: string) {
        await this.reportsNamespace.delete(ratingId);
    }
}
