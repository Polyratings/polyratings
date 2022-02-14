import { ProfessorDTO, TruncatedProfessorDTO } from '@polyratings/backend/dtos/Professors';
import { PolyratingsError } from '@polyratings/backend/utils/errors';
import { DEFAULT_VALIDATOR_OPTIONS } from '@polyratings/backend/utils/const';
import { validateOrReject } from 'class-validator';
import { PendingReviewDTO } from '@polyratings/backend/dtos/Reviews';
import { transformAndValidate } from '@polyratings/backend/utils/transform-and-validate';
import { User } from '@polyratings/backend/dtos/User';
import { plainToInstance } from 'class-transformer';

export class KVDAO {
    constructor(
        private polyratingsNamespace: KVNamespace,
        private usersNamespace: KVNamespace,
        private processingQueueNamespace: KVNamespace,
        private professorApprovalQueueNamespace:KVNamespace
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

        const existingProfessor = await this.getProfessor(professor.id)
        if(existingProfessor.firstName !== professor.firstName || existingProfessor.lastName !== professor.lastName) {
            throw new Error('Possible teacher collision detected')
        }

        await this.polyratingsNamespace.put(professor.id, JSON.stringify(professor));

        // Not actually of type TruncatedProfessorDTO just the plain version
        const profList = JSON.parse(await this.getAllProfessors()) as TruncatedProfessorDTO[];
        // Right now we have these because of the unfortunate shape of our professor list structure.
        // TODO: Investigate better structure for the professor list
        const professorIndex = profList.findIndex((t) => t.id == professor.id);
        const truncatedProf = professor.toTruncatedProfessorDTO();
        if(professorIndex == -1) {
            profList.push(truncatedProf)
        } else {
            profList[professorIndex] = truncatedProf;
        }

        await this.putAllProfessors(profList);
    }

    async removeProfessor(id: string) {
        await this.polyratingsNamespace.delete(id);

        const profList = JSON.parse(await this.getAllProfessors()) as TruncatedProfessorDTO[];
        const professorIndex = profList.findIndex((t) => t.id == id);
        
        if(professorIndex == -1) {
            throw new Error('Professor entity existed for removal but not in all professor list')
        }
        
        profList.splice(professorIndex, 1)
        await this.putAllProfessors(profList);
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
        
        this.putProfessor(professor)
    }

    async getUser(username: string): Promise<User> {
        const userString = await this.usersNamespace.get(username);

        if (!userString) {
            throw new PolyratingsError(401, 'Incorrect Credentials');
        }

        return await transformAndValidate(User, JSON.parse(userString));
    }

    async putUser(user: User) {
        await validateOrReject(user, DEFAULT_VALIDATOR_OPTIONS);

        await this.usersNamespace.put(user.username, JSON.stringify(user));
    }

    async putPendingProfessor(professor:ProfessorDTO) {
        await validateOrReject(professor, DEFAULT_VALIDATOR_OPTIONS)

        await this.professorApprovalQueueNamespace.put(professor.id, JSON.stringify(professor));
    }

    async getPendingProfessor(id: string): Promise<ProfessorDTO> {
        const pendingProfessorString = await this.professorApprovalQueueNamespace.get(id);
        if (!pendingProfessorString) {
            throw new PolyratingsError(404, 'Pending Professor does not exist.');
        }

        return await transformAndValidate(ProfessorDTO, JSON.parse(pendingProfessorString));
    }

    async getAllPendingProfessors():Promise<ProfessorDTO[]> {
        const keys = await this.professorApprovalQueueNamespace.list()
        const professorStrings = await Promise.all(keys.keys.map(key => this.professorApprovalQueueNamespace.get(key.name)))
        return professorStrings.map(plainStr => plainToInstance(ProfessorDTO, JSON.parse(plainStr!)))
    }

    removePendingProfessor(id: string): Promise<void> {
        return this.professorApprovalQueueNamespace.delete(id)
    }
}
