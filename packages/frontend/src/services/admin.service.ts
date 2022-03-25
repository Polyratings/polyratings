import { RatingReport, Review, Teacher, Internal, Client } from "@polyratings/client";
import { AuthService } from "./auth.service";
import { CacheEntry, StorageService } from ".";

const PROFESSOR_KV_DUMP_CACHE_KEY = "PROFESSOR_KV_DUMP";
const TWO_HOURS = 1000 * 60 * 60 * 2;

type ProfessorKvDumpCacheEntry = CacheEntry<Record<string, BackendProfessor>>;
export interface JoinedRatingReport extends RatingReport {
    professor: Teacher;
    review: Review;
    courseName: string;
}
export type PendingReview = Internal.PendingReviewDTOPlain & { scores: Record<string, number> };
export type BackendProfessor = Internal.PlainProfessorDTO;

export type ConnectedReview = Internal.ReviewDTO & { professorId: string; professorName: string };
export class AdminService {
    private professorKvDump: Promise<ProfessorKvDumpCacheEntry> = new Promise(() => {});

    constructor(
        private client: Client,
        authService: AuthService,
        private storageService: StorageService,
    ) {
        authService.isAuthenticatedSubject.subscribe((user) => {
            if (user) {
                this.professorKvDump = this.storageService
                    .getItem<Record<string, BackendProfessor>>(PROFESSOR_KV_DUMP_CACHE_KEY)
                    .then((result) => result ?? this.fetchProfessorKvDump());
            }
        });
    }

    private async fetchProfessorKvDump(): Promise<ProfessorKvDumpCacheEntry> {
        const professorIdMap = await this.client.admin.bulkKvRecord<BackendProfessor>("professors");

        const professorKvDump: ProfessorKvDumpCacheEntry = {
            data: professorIdMap,
            exp: Date.now() + TWO_HOURS,
            cachedAt: Date.now(),
        };

        this.storageService.setItem(PROFESSOR_KV_DUMP_CACHE_KEY, professorKvDump.data, TWO_HOURS);
        return professorKvDump;
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

    public async pendingProfessors(): Promise<BackendProfessor[]> {
        return this.client.admin.pendingProfessors();
    }

    public async approvePendingProfessor(professorId: string): Promise<BackendProfessor[]> {
        await this.client.admin.approvePendingProfessor(professorId);
        const pendingProfessors = await this.pendingProfessors();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return pendingProfessors.filter((professor) => professor.id !== professorId);
    }

    public async removePendingProfessor(professorId: string): Promise<BackendProfessor[]> {
        await this.client.admin.removePendingProfessor(professorId);
        const pendingProfessors = await this.pendingProfessors();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return pendingProfessors.filter((professor) => professor.id !== professorId);
    }

    public async removeReview(professorId: string, reviewId: string): Promise<ConnectedReview[]> {
        await this.client.admin.removeRating(professorId, reviewId);

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

        const reportsRecord = await this.client.admin.bulkKvRecord<RatingReport>("reports");
        const reports = Object.values(reportsRecord);

        const allProfessors = await (await this.professorKvDump).data;
        return reports.map((report) => {
            const professor = { ...allProfessors[report.professorId] } as Teacher;
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
        await this.client.admin.approveReport(ratingId);
        const reports = await this.getReports();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return reports.filter((report) => report.ratingId !== ratingId);
    }

    public async removeReport(ratingId: string): Promise<JoinedRatingReport[]> {
        await this.client.admin.removeReport(ratingId);
        const reports = await this.getReports();
        // Sometimes the kv store does not update fast enough to be queried immediately
        return reports.filter((report) => report.ratingId !== ratingId);
    }

    // TODO: Find a better way to handle normally private types on the frontend and in other places
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async getProcessedReviews(): Promise<PendingReview[]> {
        const reviewsRecord = await this.client.admin.bulkKvRecord<Internal.PendingReviewDTOPlain>(
            "rating-queue",
        );
        const reviews = await Object.values(reviewsRecord);

        return reviews.map((review) => {
            const scores = Object.entries(review.sentimentResponse ?? {}).reduce(
                (acc, [key, scoresObj]) => {
                    acc[key] = scoresObj.summaryScore.value;
                    return acc;
                },
                {} as Record<string, number>,
            );
            return { scores, ...review };
        });
    }
}
