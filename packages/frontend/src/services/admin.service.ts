import { BulkKey, chunkArray, RatingReport, Review, Teacher } from "@polyratings/shared";
import { config } from "@/App.config";
import { AuthService } from "./auth.service";
import { HttpService } from "./http.service";
import { CacheEntry, StorageService } from ".";

const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;
const PROFESSOR_KV_DUMP_CACHE_KEY = "PROFESSOR_KV_DUMP";
const TWO_HOURS = 1000 * 60 * 60 * 2;

type ProfessorKvDumpCacheEntry = CacheEntry<Record<string, Teacher>>;

export type ConnectedReview = Review & { professorId: string; professorName: string };

export class AdminService {
    private professorKvDump: Promise<ProfessorKvDumpCacheEntry> = new Promise(() => {});

    constructor(
        private httpService: HttpService,
        authService: AuthService,
        private storageService: StorageService,
    ) {
        authService.isAuthenticatedSubject.subscribe((user) => {
            if (user) {
                this.professorKvDump = this.storageService
                    .getItem<Record<string, Teacher>>(PROFESSOR_KV_DUMP_CACHE_KEY)
                    .then((result) => result ?? this.fetchProfessorKvDump());
            }
        });
    }

    private async fetchProfessorKvDump(): Promise<ProfessorKvDumpCacheEntry> {
        const professors = await this.bulkRead<Teacher>("professors");
        const professorIdMap = professors.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {} as Record<string, Teacher>);

        const professorKvDump: ProfessorKvDumpCacheEntry = {
            data: professorIdMap,
            exp: Date.now() + TWO_HOURS,
            cachedAt: Date.now(),
        };

        this.storageService.setItem(PROFESSOR_KV_DUMP_CACHE_KEY, professorKvDump.data, TWO_HOURS);
        return professorKvDump;
    }

    private async bulkRead<T>(bulkKey: BulkKey): Promise<T[]> {
        const keyRequest = await this.httpService.fetch(
            `${config.remoteUrl}/admin/bulk/${bulkKey}`,
        );
        const allKeys = (await keyRequest.json()) as string[];
        const chunkedKeys = chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE);
        const results = await Promise.all(
            chunkedKeys.map((chunk) =>
                this.httpService.fetch(`${config.remoteUrl}/admin/bulk/${bulkKey}`, {
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

    public async recentReviews(): Promise<ConnectedReview[]> {
        const allProfessors = (await this.professorKvDump).data;

        const allReviews: ConnectedReview[] = Object.values(allProfessors).flatMap((professor) =>
            Object.values(professor.reviews ?? [])
                .flat()
                .map((review) => ({
                    professorId: professor.id,
                    professorName: `${professor.lastName}, ${professor.firstName}`,
                    ...review,
                })),
        );

        allReviews.sort(
            (reviewA, reviewB) =>
                Date.parse(reviewB.postDate.toString()) - Date.parse(reviewA.postDate.toString()),
        );

        return allReviews;
    }

    public async professorKvDumpUpdatedAt(): Promise<string> {
        const professorKvDump = await this.professorKvDump;
        return new Date(professorKvDump.cachedAt).toLocaleTimeString("US");
    }

    public async pendingProfessors(): Promise<Teacher[]> {
        const pendingProfessorsRes = await this.httpService.fetch(
            `${config.remoteUrl}/admin/professors/pending`,
        );
        return pendingProfessorsRes.json();
    }

    public async approvePendingProfessor(professorId: string): Promise<Teacher[]> {
        await this.httpService.fetch(`${config.remoteUrl}/admin/pending/${professorId}`, {
            method: "POST",
        });
        const pendingProfessors = await this.pendingProfessors();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return pendingProfessors.filter((professor) => professor.id !== professorId);
    }

    public async removePendingProfessor(professorId: string): Promise<Teacher[]> {
        await this.httpService.fetch(`${config.remoteUrl}/admin/pending/${professorId}`, {
            method: "DELETE",
        });
        const pendingProfessors = await this.pendingProfessors();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return pendingProfessors.filter((professor) => professor.id !== professorId);
    }

    public async removeReview(professorId: string, reviewId: string): Promise<ConnectedReview[]> {
        await this.httpService.fetch(
            `${config.remoteUrl}/admin/rating/${professorId}/${reviewId}`,
            {
                method: "DELETE",
            },
        );
        // Remove review from local cache
        const professorKvDump = (await this.professorKvDump).data;
        const targetProfessor = professorKvDump[professorId];

        // Use non null assertion to make code cleaner
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [key, arr] = Object.entries(targetProfessor.reviews ?? {}).find(([, reviews]) =>
            (reviews as ConnectedReview[]).find((review) => review.id === reviewId),
        )!;

        if (arr.length === 1) {
            // It is the last review

            // We know it is defined from before
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            delete targetProfessor.reviews![key];
        } else {
            const reviewIndex = arr.findIndex(
                (review) => (review as ConnectedReview).id === reviewId,
            );
            arr.splice(reviewIndex, 1);
        }

        return this.recentReviews();
    }

    public async getReports(): Promise<JoinedRatingReport[]> {
        const alreadyRemovedReview: Review = {
            id: "N/A",
            grade: "N/A",
            courseType: "N/A" as never,
            rating: "N/A",
            postDate: new Date(),
            gradeLevel: "N/A" as never,
        };

        const reports = await this.bulkRead<RatingReport>("reports");
        const allProfessors = await (await this.professorKvDump).data;
        return reports.map((report) => {
            const professor = { ...allProfessors[report.professorId] };
            const [courseName, reviewArr] = Object.entries(professor.reviews ?? {}).find(
                ([, reviews]) => reviews.find((r) => r.id === report.ratingId),
            ) ?? ["N/A", []];
            const review = reviewArr.find((review) => review.id === report.ratingId);

            // Remove reviews since there is no need to waste memory
            delete professor.reviews;

            return { ...report, professor, review: review ?? alreadyRemovedReview, courseName };
        });
    }

    public async actOnReport(ratingId: string): Promise<JoinedRatingReport[]> {
        await this.httpService.fetch(`${config.remoteUrl}/admin/reports/${ratingId}`, {
            method: "PUT",
        });
        const reports = await this.getReports();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return reports.filter((report) => report.ratingId !== ratingId);
    }

    public async removeReport(ratingId: string): Promise<JoinedRatingReport[]> {
        await this.httpService.fetch(`${config.remoteUrl}/admin/reports/${ratingId}`, {
            method: "DELETE",
        });
        const reports = await this.getReports();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return reports.filter((report) => report.ratingId !== ratingId);
    }
}

export interface JoinedRatingReport extends RatingReport {
    professor: Teacher;
    review: Review;
    courseName: string;
}
