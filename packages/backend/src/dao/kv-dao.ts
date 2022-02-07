import {
    ProfessorDTO,
    TruncatedProfessorDTO,
} from '@polyratings/backend/dtos/Professors';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { DEFAULT_VALIDATOR_OPTIONS } from '@polyratings/backend/utils/const';
import { validateOrReject } from 'class-validator';
import { PendingReviewDTO, ReviewDTO } from '@polyratings/backend/dtos/Reviews';
import { transformAndValidate } from '@polyratings/backend/utils/transform-and-validate';
import { User } from '@polyratings/backend/dtos/User';

export class KVDAO {
    constructor(
        private polyratingsNamespace: KVNamespace,
        private usersNamespace: KVNamespace,
        private processingQueueNamespace: KVNamespace,
    ) {}

    // HACK: class-validator/transformer cannot actually parse through the entire
    // list of professors, so we just have to trust that it's actually valid/correct.
    async getAllProfessors(): Promise<string> {
        const professorList = await this.polyratingsNamespace.get('all');
        if (professorList === null)
            throw new PolyratingsError(404, 'Could not find any professors.');

        return professorList;
    }

    private async putAllProfessors(professorList: TruncatedProfessorDTO[]) {
        await this.polyratingsNamespace.put(
            'all',
            JSON.stringify(professorList),
        );
    }

    async getProfessor(id: string): Promise<ProfessorDTO> {
        const profString = await this.polyratingsNamespace.get(id);
        if (profString === null)
            throw new PolyratingsError(404, 'Professor does not exist!');

        return await transformAndValidate(ProfessorDTO, JSON.parse(profString));
    }

    async putProfessor(professor: ProfessorDTO) {
        try {
            await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new PolyratingsError(
                500,
                'Error occurred adding/updating professor.',
            );
        }

        await this.polyratingsNamespace.put(
            professor.id,
            JSON.stringify(professor),
        );
    }

    async getPendingReview(id: string): Promise<PendingReviewDTO> {
        const pendingRatingString = await this.processingQueueNamespace.get(id);
        if (pendingRatingString === null)
            throw new PolyratingsError(404, 'Rating does not exist.');

        console.info(`Retrieved a pending review:\n${pendingRatingString}`);

        const ratingObj = JSON.parse(pendingRatingString);

        console.info(
            `The professor field of the rating object: ${ratingObj.professor}`,
        );

        return await transformAndValidate(
            PendingReviewDTO,
            JSON.parse(pendingRatingString),
        );
    }

    async addPendingReview(review: PendingReviewDTO) {
        await validateOrReject(review, DEFAULT_VALIDATOR_OPTIONS);

        await this.processingQueueNamespace.put(
            review.id,
            JSON.stringify(review),
        );
    }

    async addReview(pendingReview: PendingReviewDTO) {
        await validateOrReject(pendingReview, DEFAULT_VALIDATOR_OPTIONS);

        if (pendingReview.status !== 'Successful') {
            throw new Error(
                'Cannot add rating to KV that has not been analyzed.',
            );
        }

        const professor = await this.getProfessor(pendingReview.professor);
        const newReview = ReviewDTO.fromPendingReview(pendingReview);

        const courseName = `${pendingReview.department} ${pendingReview.courseNum}`;

        if (!professor.courses.includes(courseName)) {
            professor.courses.push(courseName);
        }

        const reviews = professor.reviews[courseName];
        if (!reviews) {
            professor.reviews[courseName] = [newReview];
        } else {
            if (reviews.filter((rev) => rev.id === newReview.id).length > 0)
                throw new Error(
                    `Encountered collision or duplicate review for professor: ${newReview.professor} and rating: ${newReview.id}`,
                );

            reviews.push(newReview);

            // Could literally just be me being stupid, but for some reason, trying to put all of the math-stuff as a
            // method on the ProfessorDTO wouldn't actually affect any change on the object
            // meaning we would end up dropping the new statistics when putting the prof back into KV.

            const newMaterial =
                (professor.materialClear * professor.numEvals +
                    pendingReview.presentsMaterialClearly) /
                (professor.numEvals + 1);
            const newStudentDiff =
                (professor.studentDifficulties * professor.numEvals +
                    pendingReview.recognizesStudentDifficulties) /
                (professor.numEvals + 1);
            const newOverall =
                (professor.overallRating * professor.numEvals +
                    pendingReview.overallRating) /
                (professor.numEvals + 1);

            professor.numEvals = professor.numEvals + 1;

            // this properly rounds all of our statistics to the nearest hundredth
            professor.materialClear =
                Math.round((newMaterial + Number.EPSILON) * 100) / 100;
            professor.studentDifficulties =
                Math.round((newStudentDiff + Number.EPSILON) * 100) / 100;
            professor.overallRating =
                Math.round((newOverall + Number.EPSILON) * 100) / 100;
        }

        try {
            await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);
        } catch (e) {
            throw new Error(
                'Failed to validate professor before adding review to KV',
            );
        }

        await this.polyratingsNamespace.put(
            professor.id,
            JSON.stringify(professor),
        );

        const profList = JSON.parse(
            await this.getAllProfessors(),
        ) as TruncatedProfessorDTO[];

        // Right now we have these because of the unfortunate shape of our
        // professor list structure.
        // TODO: Investigate better structure for the professor list
        const unvalidatedProf = profList.find((t) => t.id == professor.id);
        if (unvalidatedProf == undefined)
            throw new Error(
                `Professor with id: ${professor.id} did not exist in prof list!`,
            );
        const profIndex = profList.indexOf(unvalidatedProf);

        const truncatedProf = await transformAndValidate(
            TruncatedProfessorDTO,
            profList.find((t) => t.id == professor.id),
        );

        truncatedProf.numEvals = professor.numEvals;
        truncatedProf.overallRating = professor.overallRating;
        truncatedProf.studentDifficulties = professor.studentDifficulties;
        truncatedProf.materialClear = professor.materialClear;

        profList.splice(profIndex, 1, truncatedProf);

        await this.putAllProfessors(profList);
    }

    async getUser(username: string): Promise<User> {
        const userString = await this.usersNamespace.get(username);

        if (userString === null)
            throw new PolyratingsError(401, 'Incorrect Credentials');

        return await transformAndValidate(User, userString)
    }

    async putUser(user: User) {
        await validateOrReject(user, DEFAULT_VALIDATOR_OPTIONS);

        await this.usersNamespace.put(user.username, JSON.stringify(user));
    }
}
