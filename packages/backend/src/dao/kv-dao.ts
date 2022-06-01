import { PolyratingsError } from "@polyratings/backend/utils/errors";
import { DEFAULT_VALIDATOR_OPTIONS } from "@polyratings/backend/utils/const";
import { validateOrReject } from "class-validator";
import { transformAndValidate } from "@polyratings/backend/utils/transform-and-validate";
import { plainToInstance } from "class-transformer";
import { BulkKey, Internal } from "@polyratings/shared";

const KV_REQUESTS_PER_TRIGGER = 1000;

export class KVDAO {
    constructor(
        private polyratingsNamespace: KVNamespace,
        private usersNamespace: KVNamespace,
        private processingQueueNamespace: KVNamespace,
        private professorApprovalQueueNamespace: KVNamespace,
        private reportsNamespace: KVNamespace,
    ) {}

    // HACK: class-validator/transformer cannot actually parse through the entire
    // list of professors, so we just have to trust that it's actually valid/correct.
    async getAllProfessors(): Promise<string> {
        const professorList = await this.polyratingsNamespace.get("all");
        if (!professorList) {
            throw new PolyratingsError(404, "Could not find any professors.");
        }

        return professorList;
    }

    private async putAllProfessors(professorList: Internal.TruncatedProfessorDTO[]) {
        await this.polyratingsNamespace.put("all", JSON.stringify(professorList));
    }

    async getProfessor(id: string): Promise<Internal.ProfessorDTO> {
        const profString = await this.polyratingsNamespace.get(id);
        if (!profString) {
            throw new PolyratingsError(404, "Professor does not exist!");
        }

        return transformAndValidate(Internal.ProfessorDTO, JSON.parse(profString));
    }

    getBulkNamespace(bulkKey: BulkKey): KVNamespace {
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
        const values = await Promise.all(keys.map((key) => namespace.get(key)));
        // ts can not figure out that filter prevents the map from having null values
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return values.filter((v) => v !== null).map((v) => JSON.parse(v!));
    }

    async putProfessor(professor: Internal.ProfessorDTO, skipNameCollisionDetection = false) {
        await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);

        // Need to check if key exists in order to not throw an error when calling `getProfessor`
        if (!skipNameCollisionDetection && (await this.polyratingsNamespace.get(professor.id))) {
            const existingProfessor = await this.getProfessor(professor.id);
            if (
                existingProfessor.firstName !== professor.firstName ||
                existingProfessor.lastName !== professor.lastName
            ) {
                throw new Error("Possible teacher collision detected");
            }
        }

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));

        // Not actually of type TruncatedProfessorDTO just the plain version
        const profList = JSON.parse(
            await this.getAllProfessors(),
        ) as Internal.TruncatedProfessorDTO[];
        // Right now we have these because of the unfortunate shape of our professor list structure.
        // TODO: Investigate better structure for the professor list
        const professorIndex = profList.findIndex((t) => t.id === professor.id);
        const truncatedProf = professor.toTruncatedProfessorDTO();

        if (professorIndex === -1) {
            profList.push(truncatedProf);
        } else {
            profList[professorIndex] = truncatedProf;
        }

        await this.putAllProfessors(profList);
    }

    async removeProfessor(id: string) {
        await this.polyratingsNamespace.delete(id);

        const profList = JSON.parse(
            await this.getAllProfessors(),
        ) as Internal.TruncatedProfessorDTO[];
        const professorIndex = profList.findIndex((t) => t.id === id);

        if (professorIndex === -1) {
            throw new Error("Professor entity existed for removal but not in all professor list");
        }

        profList.splice(professorIndex, 1);
        await this.putAllProfessors(profList);
    }

    async getPendingReview(id: string): Promise<Internal.PendingReviewDTO> {
        const pendingRatingString = await this.processingQueueNamespace.get(id);
        if (!pendingRatingString) {
            throw new PolyratingsError(404, "Rating does not exist.");
        }

        return transformAndValidate(Internal.PendingReviewDTO, JSON.parse(pendingRatingString));
    }

    async addPendingReview(review: Internal.PendingReviewDTO) {
        await validateOrReject(review, DEFAULT_VALIDATOR_OPTIONS);

        await this.processingQueueNamespace.put(review.id, JSON.stringify(review));
    }

    async addReview(pendingReview: Internal.PendingReviewDTO): Promise<Internal.ProfessorDTO> {
        await validateOrReject(pendingReview, DEFAULT_VALIDATOR_OPTIONS);

        if (pendingReview.status !== "Successful") {
            throw new Error("Cannot add rating to KV that has not been analyzed.");
        }

        const professor = await this.getProfessor(pendingReview.professor);
        const newReview = pendingReview.toReviewDTO();
        professor.addReview(newReview, `${pendingReview.department} ${pendingReview.courseNum}`);

        this.putProfessor(professor);
        return professor;
    }

    async removeReview(professorId: string, reviewId: string) {
        const professor = await this.getProfessor(professorId);
        professor.removeReview(reviewId);
        return this.putProfessor(professor);
    }

    async getUser(username: string): Promise<Internal.User> {
        const userString = await this.usersNamespace.get(username);

        if (!userString) {
            throw new PolyratingsError(401, "Incorrect Credentials");
        }

        return transformAndValidate(Internal.User, JSON.parse(userString));
    }

    async putUser(user: Internal.User) {
        await validateOrReject(user, DEFAULT_VALIDATOR_OPTIONS);

        await this.usersNamespace.put(user.username, JSON.stringify(user));
    }

    async putPendingProfessor(professor: Internal.ProfessorDTO) {
        await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);

        await this.professorApprovalQueueNamespace.put(professor.id, JSON.stringify(professor));
    }

    async getPendingProfessor(id: string): Promise<Internal.ProfessorDTO> {
        const pendingProfessorString = await this.professorApprovalQueueNamespace.get(id);
        if (!pendingProfessorString) {
            throw new PolyratingsError(404, "Pending Professor does not exist.");
        }

        return transformAndValidate(Internal.ProfessorDTO, JSON.parse(pendingProfessorString));
    }

    async getAllPendingProfessors(): Promise<Internal.ProfessorDTO[]> {
        const keys = await this.professorApprovalQueueNamespace.list();
        const professorStrings = await Promise.all(
            keys.keys.map((key) => this.professorApprovalQueueNamespace.get(key.name)),
        );
        return (
            professorStrings
                .filter((plainStr) => plainStr)
                // We filter to make sure there is no race condition and keys are actually defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .map((plainStr) => plainToInstance(Internal.ProfessorDTO, JSON.parse(plainStr!)))
        );
    }

    removePendingProfessor(id: string): Promise<void> {
        return this.professorApprovalQueueNamespace.delete(id);
    }

    async getReport(ratingId: string): Promise<Internal.RatingReport> {
        const ratingStr = await this.reportsNamespace.get(ratingId);
        if (!ratingStr) {
            throw new PolyratingsError(404, "Report does not exist!");
        }

        return transformAndValidate(Internal.RatingReport, JSON.parse(ratingStr));
    }

    async putReport(report: Internal.RatingReport): Promise<void> {
        await validateOrReject(report, DEFAULT_VALIDATOR_OPTIONS);
        const existingReportStr = await this.reportsNamespace.get(report.ratingId);

        if (existingReportStr) {
            const existingReport = plainToInstance(
                Internal.RatingReport,
                JSON.parse(existingReportStr),
            );
            existingReport.reports = existingReport.reports.concat(report.reports);
            await validateOrReject(existingReport, DEFAULT_VALIDATOR_OPTIONS);
            await this.reportsNamespace.put(report.ratingId, JSON.stringify(existingReport));
        } else {
            await this.reportsNamespace.put(report.ratingId, JSON.stringify(report));
        }
    }

    async removeReport(ratingId: string) {
        await this.reportsNamespace.delete(ratingId);
    }
}
