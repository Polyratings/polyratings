import { ALL_PROFESSOR_KEY, BulkKey, BulkKeyMap } from "@backend/utils/const";
import { chunkArray, mapInBatches } from "@backend/utils/chunkArray";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
    PendingRating,
    pendingRatingParser,
    Professor,
    professorParser,
    RatingReport,
    ratingReportParser,
    TruncatedProfessor,
    truncatedProfessorParser,
    User,
    userParser,
} from "@backend/types/schema";
import {
    addRating as addRatingToProfessor,
    professorToTruncatedProfessor,
    removeRating,
    removeRatingsBulk as removeRatingsBulkFromProfessor,
} from "@backend/types/schemaHelpers";
import { KvWrapper } from "./kv-wrapper";

const KV_REQUESTS_PER_TRIGGER = 1000;
const THREE_WEEKS_SECONDS = 60 * 60 * 24 * 7 * 3;

// Batch processing constants for performance optimization.
// Windows of this size are awaited before the next window starts to avoid KV 503s.
const BULK_FETCH_CONCURRENCY = 50;
const INDIVIDUAL_WRITE_CONCURRENCY = 10;

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

    /**
     * Batch update professors to reduce write amplification.
     * Updates multiple professors with a single read and write of the professor list.
     *
     * WARNING: This method is not thread-safe. Concurrent calls to this method
     * can result in lost updates due to race conditions (read-modify-write pattern).
     * Ensure only one batch update runs at a time, or use a queue/sequencer.
     *
     * Cloudflare KV does not support transactions, so true atomicity is not possible.
     * Per-id records are written first (same order as `putProfessor`); the master
     * list is only written if every individual write succeeds. If another process
     * modifies the list concurrently, one update may still be lost.
     *
     * TODO: Migrate professor storage to D1 so list + record updates can run in a
     * single SQL transaction instead of this KV read-modify-write.
     */
    async batchUpdateProfessors(
        updates: Array<{ id: string; professor?: Professor; deleted?: boolean }>,
    ): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        // Read professor list fresh each time to minimize race condition window
        const profList = await this.getAllProfessors();

        // Collect write thunks so KV I/O does not start until we finish planning.
        const individualWrites: Array<() => Promise<void>> = [];

        for (const update of updates) {
            if (update.deleted) {
                const professorIndex = profList.findIndex((t) => t.id === update.id);
                if (professorIndex !== -1) {
                    profList.splice(professorIndex, 1);
                }
                individualWrites.push(async () => {
                    await this.polyratingsNamespace.delete(update.id);
                });
            } else if (update.professor) {
                const { professor } = update;
                individualWrites.push(async () => {
                    await this.polyratingsNamespace.put(professorParser, professor.id, professor);
                });

                const professorIndex = profList.findIndex((t) => t.id === professor.id);
                const truncatedProf = professorToTruncatedProfessor(professor);

                if (professorIndex === -1) {
                    profList.push(truncatedProf);
                } else {
                    profList[professorIndex] = truncatedProf;
                }
            }
        }

        const writeResults: PromiseSettledResult<void>[] = [];
        for (const batch of chunkArray(individualWrites, INDIVIDUAL_WRITE_CONCURRENCY)) {
            // eslint-disable-next-line no-await-in-loop -- windows must complete before the next starts
            writeResults.push(...(await Promise.allSettled(batch.map((write) => write()))));
        }

        const failedWrites = writeResults.filter(
            (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        if (failedWrites.length > 0) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to persist ${failedWrites.length} of ${individualWrites.length} professor record(s). Master list was not updated.`,
                cause: failedWrites[0].reason,
            });
        }

        await this.putAllProfessors(profList);
    }

    getProfessor(id: string) {
        return this.polyratingsNamespace.get(professorParser, id);
    }

    getProfessorOptional(id: string) {
        return this.polyratingsNamespace.getOptional(professorParser, id);
    }

    getBulkNamespace(bulkKey: BulkKey): { namespace: KvWrapper; parser: z.ZodTypeAny } {
        const namespaceMap: Record<BulkKey, { namespace: KvWrapper; parser: z.ZodTypeAny }> = {
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

        await this.polyratingsNamespace.put(professorParser, professor.id, professor);

        const profList = await this.getAllProfessors();
        // Right now we have these because of the unfortunate shape of our professor list structure.
        // TODO: Investigate better structure for the professor list
        const professorIndex = profList.findIndex((t) => t.id === professor.id);
        const truncatedProf = professorToTruncatedProfessor(professor);

        if (professorIndex === -1) {
            profList.push(truncatedProf);
        } else {
            profList[professorIndex] = truncatedProf;
        }

        await this.putAllProfessors(profList);

        return professor;
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
            `${newRating.department} ${newRating.courseNum}`,
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

    putPendingProfessor(professor: Professor) {
        return this.professorApprovalQueueNamespace.put(professorParser, professor.id, professor);
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
            await this.reportsNamespace.put(ratingReportParser, report.ratingId, existingReport);
        } else {
            await this.reportsNamespace.put(ratingReportParser, report.ratingId, report);
        }
    }

    async removeReport(ratingId: string) {
        await this.reportsNamespace.delete(ratingId);
    }
}
