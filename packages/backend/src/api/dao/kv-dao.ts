import { Context } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ProfessorDTO } from '@polyratings/backend/dtos/Professors';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { transformAndValidate } from 'class-transformer-validator';
import { DEFAULT_VALIDATOR_OPTIONS } from '@polyratings/backend/utils/const';
import { validateOrReject } from 'class-validator';
import { PendingReviewDTO, ReviewDTO } from '@polyratings/backend/dtos/Reviews';

export class KVDAO {
    private polyratingsNamespace: KVNamespace;
    private usersNamespace: KVNamespace;
    private processingQueueNamespace: KVNamespace;

    constructor(ctx: Context<Env>) {
        this.polyratingsNamespace = ctx.env.POLYRATINGS;
        this.usersNamespace = ctx.env.POLYRATINGS_USERS;
        this.processingQueueNamespace = ctx.env.PROCESSING_QUEUE;
    }

    // HACK: class-validator/transformer cannot actually parse through the entire
    // list of professors, so we just have to trust that it's actually valid/correct.
    async getAllProfessors(): Promise<string> {
        const professorList = await this.polyratingsNamespace.get('all');
        if (professorList === null)
            throw new PolyratingsError(404, "Could not find any professors.");

        return professorList;
    }

    async getProfessor(id: string): Promise<ProfessorDTO> {
        const profString = await this.polyratingsNamespace.get(id);
        if (profString === null)
            throw new PolyratingsError(404, "Professor does not exist!");

        return await transformAndValidate(ProfessorDTO, JSON.parse(profString), {validator: DEFAULT_VALIDATOR_OPTIONS}) as ProfessorDTO;
    }

    async putProfessor(professor: ProfessorDTO) {
        try {
            await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new PolyratingsError(500, "Error occurred adding/updating professor.");
        }

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));
    }

    async getPendingReview(id: string): Promise<PendingReviewDTO> {
        const pendingRatingString = await this.processingQueueNamespace.get(id);
        if (pendingRatingString === null)
            throw new PolyratingsError(404, "Rating does not exist.");

        console.info(`Retrieved a pending review:\n${pendingRatingString}`);

        const ratingObj = JSON.parse(pendingRatingString);

        console.info(`The professor field of the rating object: ${ratingObj.professor}`);

        return await transformAndValidate(PendingReviewDTO, JSON.parse(pendingRatingString), {validator: DEFAULT_VALIDATOR_OPTIONS}) as PendingReviewDTO;
    }

    async addPendingReview(review: PendingReviewDTO) {
        try {
            await validateOrReject(review, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new PolyratingsError(500, "Error occurred adding pending review.");
        }

        await this.processingQueueNamespace.put(review.id, JSON.stringify(review));
    }

    async addReview(pendingReview: PendingReviewDTO) {
        try {
            await validateOrReject(pendingReview, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new PolyratingsError(500, "Could not validate pending review");
        }

        if (pendingReview.status !== 'Successful') {
            throw new Error("Cannot add rating to KV that has not been analyzed.")
        }

        const professor = await this.getProfessor(pendingReview.professor);
        const newReview = ReviewDTO.fromPendingReview(pendingReview);

        try {
            await validateOrReject(newReview, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new Error("Failed to validate new rating before adding to KV");
        }

        const courseName = `${pendingReview.department} ${pendingReview.courseNum}`;

        if (!professor.courses.includes(courseName)) {
            professor.courses.push(courseName);
        }

        const reviews = professor.reviews[courseName];
        if (!reviews) {
            professor.reviews[courseName] = [newReview];
        } else {
            if (reviews.filter(rev => rev.id === newReview.id).length > 0)
                throw new Error(`Encountered collision or duplicate review for professor: ${newReview.professor} and rating: ${newReview.id}`);

            reviews.push(newReview);

            // Could literally just be me being stupid, but for some reason, trying to put all of the math-stuff as a
            // method on the ProfessorDTO wouldn't actually affect any change on the object
            // meaning we would end up dropping the new statistics when putting the prof back into KV.

            const newMaterial =
                ((professor.materialClear * professor.numEvals) + pendingReview.presentsMaterialClearly)
                / (professor.numEvals + 1);
            const newStudentDiff =
                ((professor.studentDifficulties * professor.numEvals) + pendingReview.recognizesStudentDifficulties)
                / (professor.numEvals + 1);
            const newOverall =
                ((professor.overallRating * professor.numEvals) + pendingReview.overallRating)
                / (professor.numEvals + 1);

            professor.numEvals = professor.numEvals + 1;

            // this properly rounds all of our statistics to the nearest hundredth
            professor.materialClear = Math.round((newMaterial + Number.EPSILON) * 100) / 100;
            professor.studentDifficulties = Math.round((newStudentDiff + Number.EPSILON) * 100) / 100;
            professor.overallRating = Math.round((newOverall + Number.EPSILON) * 100) / 100;
        }

        try {
            await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new Error("Failed to validate professor before adding review to KV");
        }

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));
    }
}