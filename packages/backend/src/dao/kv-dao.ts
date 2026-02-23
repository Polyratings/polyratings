import { ALL_PROFESSOR_KEY, BulkKey, BulkKeyMap } from "@backend/utils/const";
import { chunkArray } from "@backend/utils/chunkArray";
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
} from "@backend/types/schemaHelpers";
import { KvWrapper } from "./kv-wrapper";

const KV_REQUESTS_PER_TRIGGER = 1000;
const THREE_WEEKS_SECONDS = 60 * 60 * 24 * 7 * 3;

// Batch processing constants for performance optimization
// Batch size chosen to avoid 503 errors from KV rate limits
const BULK_FETCH_BATCH_SIZE = 50;
const PARALLEL_BATCH_CONCURRENCY = 5; // Number of batches to process simultaneously

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
     * This method reads the professor list, applies all updates, and writes it back.
     * If another process modifies the list concurrently, one update may be lost.
     */
    async batchUpdateProfessors(
        updates: Array<{ id: string; professor?: Professor; deleted?: boolean }>,
    ): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        // Read professor list fresh each time to minimize race condition window
        const profList = await this.getAllProfessors();

        // Collect all write operations to execute in parallel
        const writePromises: Promise<void>[] = [];

        // Process all updates
        for (const update of updates) {
            if (update.deleted) {
                // Remove professor from list
                const professorIndex = profList.findIndex((t) => t.id === update.id);
                if (professorIndex !== -1) {
                    profList.splice(professorIndex, 1);
                }
                // Delete individual professor key (collect promise, don't await)
                writePromises.push(
                    this.polyratingsNamespace.delete(update.id).then(() => undefined),
                );
            } else if (update.professor) {
                const { professor } = update;
                // Update individual professor key (collect promise, don't await)
                writePromises.push(
                    this.polyratingsNamespace
                        .put(professorParser, professor.id, professor)
                        .then(() => undefined),
                );

                // Update professor in list
                const professorIndex = profList.findIndex((t) => t.id === professor.id);
                const truncatedProf = professorToTruncatedProfessor(professor);

                if (professorIndex === -1) {
                    profList.push(truncatedProf);
                } else {
                    profList[professorIndex] = truncatedProf;
                }
            }
        }

        // First, write the updated professor list to minimize the risk of
        // having individual records that are not reflected in the master list.
        await this.putAllProfessors(profList);

        // Then, execute all individual writes in parallel
        await Promise.all(writePromises);
    }

    getProfessor(id: string) {
        return this.polyratingsNamespace.get(professorParser, id);
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

        // Batch keys into smaller chunks to avoid 503 errors
        const keyChunks = chunkArray(keys, BULK_FETCH_BATCH_SIZE);

        // Process batches in parallel with controlled concurrency
        // Track key-value pairs to maintain correct mapping even if some batches fail
        const batchPromises: Promise<Array<{ key: string; value: unknown }>>[] = [];
        for (let i = 0; i < keyChunks.length; i += PARALLEL_BATCH_CONCURRENCY) {
            const concurrentBatches = keyChunks.slice(i, i + PARALLEL_BATCH_CONCURRENCY);
            const batchPromise = Promise.allSettled(
                concurrentBatches.map((chunk) =>
                    Promise.all(
                        chunk.map(async (key) => {
                            const value = await namespace.getUnsafe(key);
                            return { key, value };
                        }),
                    ),
                ),
            ).then((results) => {
                // Flatten results and handle errors, maintaining key-value pairs
                const keyValuePairs: Array<{ key: string; value: unknown }> = [];
                const errors: unknown[] = [];
                for (const result of results) {
                    if (result.status === "fulfilled") {
                        keyValuePairs.push(...result.value);
                    } else {
                        errors.push(result.reason);
                    }
                }
                if (errors.length > 0) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `One or more bulk fetch batches failed (${errors.length} of ${results.length} batches).`,
                        cause: errors[0],
                    });
                }
                return keyValuePairs;
            });
            batchPromises.push(batchPromise);
        }

        // Wait for all batches to complete
        const allResults = await Promise.all(batchPromises);
        const flatKeyValuePairs = allResults.flat();

        // Validate results using parser (maintains data integrity)
        // Return key-value pairs to maintain correct mapping with input keys
        const validatedResults: Array<{ key: string; value: BulkKeyMap[T][number] }> = [];
        for (const { key, value } of flatKeyValuePairs) {
            if (value !== null && value !== undefined) {
                try {
                    // Validate each item using the parser
                    const parsed = parser.parse(value);
                    validatedResults.push({ key, value: parsed as BulkKeyMap[T][number] });
                } catch (error) {
                    // Log validation error with correct key but continue processing
                    // eslint-disable-next-line no-console
                    console.error(`Validation error for key ${key}:`, error);
                }
            }
            // Skip null/undefined values (deleted keys)
        }

        return validatedResults;
    }

    async putProfessor(
        professor: Professor,
        options?: {
            skipNameCollisionDetection?: boolean;
            cachedProfessorList?: TruncatedProfessor[];
        },
    ) {
        const skipNameCollisionDetection = options?.skipNameCollisionDetection ?? false;
        const cachedProfessorList = options?.cachedProfessorList;
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

        // Use cached list if provided, otherwise fetch it
        const profList = cachedProfessorList ?? (await this.getAllProfessors());
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

    async removeProfessor(id: string, cachedProfessorList?: TruncatedProfessor[]) {
        await this.polyratingsNamespace.delete(id);

        // Use cached list if provided, otherwise fetch it
        const profList = cachedProfessorList ?? (await this.getAllProfessors());
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
        removeRating(professor, ratingId);
        return this.putProfessor(professor);
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

    async getAllPendingProfessors() {
        return this.professorApprovalQueueNamespace.getAll(professorParser);
    }

    removePendingProfessor(id: string) {
        return this.professorApprovalQueueNamespace.delete(id);
    }

    async getReport(ratingId: string) {
        return this.reportsNamespace.get(ratingReportParser, ratingId);
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
