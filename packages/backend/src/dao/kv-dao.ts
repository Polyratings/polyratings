import { ProfessorDTO, TruncatedProfessorDTO } from '@polyratings/backend/dtos/Professors';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { DEFAULT_VALIDATOR_OPTIONS } from '@polyratings/backend/utils/const';
import { validateOrReject } from 'class-validator';
import { PendingReviewDTO } from '@polyratings/backend/dtos/Reviews';
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
        if (!professorList) {
            throw new PolyratingsError(404, 'Could not find any professors.');
        }

        return professorList;
    }

    private async putAllProfessors(professorList: TruncatedProfessorDTO[]) {
        await this.polyratingsNamespace.put('all', JSON.stringify(professorList));
    }

    async getProfessor(id: string): Promise<ProfessorDTO> {
        const profString = await this.polyratingsNamespace.get(id);
        if (!profString) {
            throw new PolyratingsError(404, 'Professor does not exist!');
        }

        return await transformAndValidate(ProfessorDTO, JSON.parse(profString));
    }

    async putProfessor(professor: ProfessorDTO) {
        await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));
    }

    async getPendingReview(id: string): Promise<PendingReviewDTO> {
        const pendingRatingString = await this.processingQueueNamespace.get(id);
        if (!pendingRatingString) {
            throw new PolyratingsError(404, 'Rating does not exist.');
        }

        return await transformAndValidate(PendingReviewDTO, JSON.parse(pendingRatingString));
    }

    async addPendingReview(review: PendingReviewDTO) {
        await validateOrReject(review, DEFAULT_VALIDATOR_OPTIONS);

        await this.processingQueueNamespace.put(review.id, JSON.stringify(review));
    }

    async addReview(pendingReview: PendingReviewDTO) {
        await validateOrReject(pendingReview, DEFAULT_VALIDATOR_OPTIONS);

        if (pendingReview.status !== 'Successful') {
            throw new Error('Cannot add rating to KV that has not been analyzed.');
        }

        const professor = await this.getProfessor(pendingReview.professor);
        const newReview = pendingReview.toReviewDTO();
        professor.addReview(newReview, `${pendingReview.department} ${pendingReview.courseNum}`);

        await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS);

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));

        const profList = JSON.parse(await this.getAllProfessors()) as TruncatedProfessorDTO[];

        // Right now we have these because of the unfortunate shape of our
        // professor list structure.
        // TODO: Investigate better structure for the professor list
        const professorIndex = profList.findIndex((t) => t.id == professor.id);
        if (professorIndex === -1) {
            throw new Error(`Professor with id: ${professor.id} did not exist in prof list!`);
        }

        const truncatedProf = professor.toTruncatedProfessorDTO();
        profList[professorIndex] = truncatedProf;

        await this.putAllProfessors(profList);
    }

    async getUser(username: string): Promise<User> {
        const userString = await this.usersNamespace.get(username);

        if (!userString) {
            throw new PolyratingsError(401, 'Incorrect Credentials');
        }

        return await transformAndValidate(User, userString);
    }

    async putUser(user: User) {
        await validateOrReject(user, DEFAULT_VALIDATOR_OPTIONS);

        await this.usersNamespace.put(user.username, JSON.stringify(user));
    }
}
