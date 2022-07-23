import { PolyratingsError } from "@backend/utils/errors";
import { BulkKey } from "@backend/utils/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
    PendingRating,
    pendingRatingValidator,
    Professor,
    professorValidator,
    RatingReport,
    ratingReportValidator,
    TruncatedProfessor,
    truncatedProfessorValidator,
    User,
    userValidator,
} from "@backend/types/schema";
import {
    addRating,
    pendingRatingToRating,
    professorToTruncatedProfessor,
    removeRating,
} from "@backend/types/schemaHelpers";
import { KvWrapper } from "./kv-wrapper";

const KV_REQUESTS_PER_TRIGGER = 1000;

export class KVDAO {
    constructor(
        private polyratingsNamespace: KvWrapper,
        private usersNamespace: KvWrapper,
        private processingQueueNamespace: KvWrapper,
        private professorApprovalQueueNamespace: KvWrapper,
        private reportsNamespace: KvWrapper,
    ) {}

    async getAllProfessors() {
        const professorList = await this.polyratingsNamespace.get(
            z.array(truncatedProfessorValidator),
            "all",
        );
        if (!professorList) {
            throw new PolyratingsError(404, "Could not find any professors.");
        }

        return professorList;
    }

    private async putAllProfessors(professorList: TruncatedProfessor[]) {
        await this.polyratingsNamespace.put(
            z.array(truncatedProfessorValidator),
            "all",
            professorList,
        );
    }

    getProfessor(id: string) {
        return this.polyratingsNamespace.get(professorValidator, id);
    }

    getBulkNamespace(bulkKey: BulkKey): KvWrapper {
        switch (bulkKey) {
            case "professors":
                return this.polyratingsNamespace;
            case "professor-queue":
                return this.professorApprovalQueueNamespace;
            case "users":
                return this.usersNamespace;
            case "reports":
                return this.reportsNamespace;
            case "rating-queue":
                return this.processingQueueNamespace;
            default:
                throw new PolyratingsError(404, "Bulk key is not valid");
        }
    }

    async getBulkKeys(bulkKey: BulkKey): Promise<string[]> {
        const namespace = this.getBulkNamespace(bulkKey);
        const keys: string[] = [];
        let cursor: string | undefined;
        do {
            let options = {};
            if (cursor) {
                options = { cursor };
            }
            // Have to be consecutive
            // eslint-disable-next-line no-await-in-loop
            const result = await namespace.list(options);
            cursor = result.cursor;
            result.keys.forEach((key) => {
                keys.push(key.name);
            });
        } while (cursor);

        return keys;
    }

    async getBulkValues(bulkKey: BulkKey, keys: string[]) {
        if (keys.length > KV_REQUESTS_PER_TRIGGER) {
            throw new PolyratingsError(
                400,
                `Can not process more than ${KV_REQUESTS_PER_TRIGGER} keys per request`,
            );
        }
        const namespace = this.getBulkNamespace(bulkKey);
        return Promise.all(keys.map((key) => namespace.getUnsafe(key)));
    }

    async putProfessor(professor: Professor, skipNameCollisionDetection = false) {
        // Need to check if key exists in order to not throw an error when calling `getProfessor`
        if (!skipNameCollisionDetection && (await this.getProfessor(professor.id))) {
            const existingProfessor = await this.getProfessor(professor.id);
            if (
                existingProfessor.firstName !== professor.firstName ||
                existingProfessor.lastName !== professor.lastName
            ) {
                throw new Error("Possible teacher collision detected");
            }
        }

        await this.polyratingsNamespace.put(professorValidator, professor.id, professor);

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

    getPendingReview(id: string) {
        return this.processingQueueNamespace.get(pendingRatingValidator, id);
    }

    async addPendingReview(rating: PendingRating) {
        return this.processingQueueNamespace.put(pendingRatingValidator, rating.id, rating);
    }

    async addReview(pendingReview: PendingRating) {
        if (pendingReview.status !== "Successful") {
            throw new Error("Cannot add rating to KV that has not been analyzed.");
        }

        const professor = await this.getProfessor(pendingReview.professor);
        const newReview = pendingRatingToRating(pendingReview);
        addRating(professor, newReview, `${pendingReview.department} ${pendingReview.courseNum}`);

        this.putProfessor(professor);
        return professor;
    }

    async removeReview(professorId: string, reviewId: string) {
        const professor = await this.getProfessor(professorId);
        removeRating(professor, reviewId);
        return this.putProfessor(professor);
    }

    async getUser(username: string) {
        try {
            const user = await this.usersNamespace.get(userValidator, username);
            return user;
        } catch (e) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
    }

    putUser(user: User) {
        return this.usersNamespace.put(userValidator, user.username, user);
    }

    putPendingProfessor(professor: Professor) {
        return this.professorApprovalQueueNamespace.put(
            professorValidator,
            professor.id,
            professor,
        );
    }

    async getPendingProfessor(id: string) {
        return this.professorApprovalQueueNamespace.get(professorValidator, id);
    }

    async getAllPendingProfessors() {
        return this.professorApprovalQueueNamespace.getAll(professorValidator);
    }

    removePendingProfessor(id: string) {
        return this.professorApprovalQueueNamespace.delete(id);
    }

    async getReport(ratingId: string) {
        return this.reportsNamespace.get(ratingReportValidator, ratingId);
    }

    async putReport(report: RatingReport): Promise<void> {
        const existingReport = await this.reportsNamespace.getOptional(
            ratingReportValidator,
            report.ratingId,
        );

        if (existingReport) {
            existingReport.reports = existingReport.reports.concat(report.reports);
            await this.reportsNamespace.put(ratingReportValidator, report.ratingId, existingReport);
        } else {
            await this.reportsNamespace.put(ratingReportValidator, report.ratingId, report);
        }
    }

    async removeReport(ratingId: string) {
        await this.reportsNamespace.delete(ratingId);
    }
}
