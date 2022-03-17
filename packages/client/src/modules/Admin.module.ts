import {
    BulkKey,
    ChangeDepartmentRequest,
    chunkArray,
    Internal,
    MergeProfessorRequest,
} from "@polyratings/shared";
import { HttpModule } from ".";

const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;

export class AdminModule {
    constructor(private httpModule: HttpModule) {}

    /**
     * Returns the keys associated with a KV store for a given BulkKey.
     */
    async bulkKvKeys<S = BulkKey>(bulkKey: S): Promise<string[]> {
        const keyRequest = await this.httpModule.fetch(`/admin/bulk/${bulkKey}`);
        return keyRequest.json();
    }

    /**
     * Given a set of KV keys it will retrieve the values in the kv store given a BulkKey.
     */
    async bulkKvValues<T, S = BulkKey>(bulkKey: S, keys: string[]): Promise<T[]> {
        const chunkedKeys = chunkArray(keys, WORKER_RETRIEVAL_CHUNK_SIZE);
        const results = await Promise.all(
            chunkedKeys.map((chunk) =>
                this.httpModule.fetch(`/admin/bulk/${bulkKey}`, {
                    method: "POST",
                    body: JSON.stringify({
                        keys: chunk,
                    }),
                }),
            ),
        );

        const bodies2d = await Promise.all(results.map((res) => res.json()));
        return bodies2d.flat() as T[];
    }

    /**
     * Returns a record of keys to values in a given KV store.
     */
    async bulkKvRecord<T>(bulkKey: BulkKey): Promise<Record<string, T>> {
        const keys = await this.bulkKvKeys(bulkKey);
        const values = await this.bulkKvValues<T>(bulkKey, keys);
        return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    }

    /**
     * Gets all of the pending professors.
     */
    async pendingProfessors(): Promise<Internal.ProfessorDTO[]> {
        const pendingProfessorsRes = await this.httpModule.fetch("/admin/professors/pending");
        return pendingProfessorsRes.json();
    }

    /**
     * Approves a pending professor and adds it to the polyratings database.
     */
    async approvePendingProfessor(professorId: string): Promise<void> {
        await this.httpModule.fetch(`$/admin/pending/${professorId}`, {
            method: "POST",
        });
    }

    /**
     * Removes pending professor from manual review queue.
     */
    async removePendingProfessor(professorId: string): Promise<void> {
        await this.httpModule.fetch(`/admin/pending/${professorId}`, {
            method: "DELETE",
        });
    }

    /**
     * Removes a rating from the polyratings database.
     */
    async removeRating(professorId: string, reviewId: string): Promise<void> {
        await this.httpModule.fetch(`/admin/rating/${professorId}/${reviewId}`, {
            method: "DELETE",
        });
    }

    /**
     * Approves rating report and removes the offending report from the database.
     */
    async approveReport(ratingId: string): Promise<void> {
        await this.httpModule.fetch(`/admin/reports/${ratingId}`, {
            method: "POST",
        });
    }

    /**
     * Rejects rating report and removes the rating report from the queue.
     */
    async removeReport(ratingId: string): Promise<void> {
        await this.httpModule.fetch(`/admin/reports/${ratingId}`, {
            method: "DELETE",
        });
    }

    /**
     * Removes a professor from the polyratings database.
     */
    async deleteProfessor(id: string): Promise<void> {
        await this.httpModule.fetch(`/admin/professor/${id}`, { method: "DELETE" });
    }

    /**
     * Merges the source professor into the destination professor, merging all courses and ratings.
     */
    async mergeProfessor(mergeRequest: MergeProfessorRequest): Promise<void> {
        await this.httpModule.fetch("/admin/professor/merge", {
            body: JSON.stringify(mergeRequest),
            method: "POST",
        });
    }

    /**
     * Changes a professors primary department.
     */
    async changeProfessorDepartment(
        departmentChangeRequest: ChangeDepartmentRequest,
    ): Promise<void> {
        await this.httpModule.fetch("/admin/professor/department", {
            body: JSON.stringify(departmentChangeRequest),
            method: "POST",
        });
    }
}
