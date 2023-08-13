import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { BulkKey, BulkKeyMap } from "@backend/utils/const";
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
            z.array(truncatedProfessorParser),
            "all",
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
            z.array(truncatedProfessorParser),
            "all",
            professorList,
        );
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

    async getBulkValues<T extends BulkKey>(bulkKey: T, keys: string[]): Promise<BulkKeyMap[T]> {
        if (keys.length > KV_REQUESTS_PER_TRIGGER) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Can not process more than ${KV_REQUESTS_PER_TRIGGER} keys per request`,
            });
        }
        const { namespace } = this.getBulkNamespace(bulkKey);
        // Use get unsafe for performance reasons. Since we are fetching a large number of records
        // the time can be greater than 50ms resulting in occasional 503's
        return Promise.all(keys.map((key) => namespace.getUnsafe(key))) as never;
    }

    async putProfessor(professor: Professor, skipNameCollisionDetection = false) {
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
        } catch (e) {
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
