import { chunkArray, Review, Teacher } from "@polyratings/shared";
import { config } from "@/App.config";
import { AuthService } from "./auth.service";
import { HttpService } from "./http.service";

const POLYRATINGS_INDEXED_DB_NAME = "POLYRATINGS";
const POLYRATINGS_OBJECT_STORE = "POLYRATINGS";
const POLYRATINGS_INDEXED_DB_VERSION = 1;
const WORKER_RETRIEVAL_CHUNK_SIZE = 1000;
const PROFESSOR_KV_DUMP_CACHE_KEY = "PROFESSOR_KV_DUMP";
const TWO_HOURS = 1000 * 60 * 60 * 2;

interface ProfessorKvDump {
    exp: number;
    retrievedAt: number;
    data: Record<string, Teacher>;
}

export type ConnectedReview = Review & { professorId: string; professorName: string; id: string };

export class AdminService {
    private professorKvDump: Promise<ProfessorKvDump> = new Promise(() => {});

    private databaseConnection: Promise<IDBDatabase> = new Promise((resolve) => {
        const dbOpenRequest = indexedDB.open(
            POLYRATINGS_INDEXED_DB_NAME,
            POLYRATINGS_INDEXED_DB_VERSION,
        );

        dbOpenRequest.onupgradeneeded = (): void => {
            const db = dbOpenRequest.result;
            // Wipes out all auto-save data on upgrade
            if (db.objectStoreNames.contains(POLYRATINGS_OBJECT_STORE)) {
                db.deleteObjectStore(POLYRATINGS_OBJECT_STORE);
            }

            db.createObjectStore(POLYRATINGS_OBJECT_STORE);
        };

        dbOpenRequest.onerror = (): void => {
            // eslint-disable-next-line no-console
            console.error("Polyratings IndexedDb error:", dbOpenRequest.error);
        };

        dbOpenRequest.onsuccess = (): void => {
            resolve(dbOpenRequest.result);
        };
    });

    constructor(private httpService: HttpService, authService: AuthService) {
        authService.isAuthenticatedSubject.subscribe((user) => {
            if (user) {
                this.professorKvDump = this.getLocalProfessorKvDump().then(
                    (result) => result ?? this.fetchProfessorKvDump(),
                );
            }
        });
    }

    private async fetchProfessorKvDump(): Promise<ProfessorKvDump> {
        const keyRequest = await this.httpService.fetch(`${config.remoteUrl}/admin/professor/keys`);
        const allKeys = (await keyRequest.json()) as string[];
        const chunkedKeys = chunkArray(allKeys, WORKER_RETRIEVAL_CHUNK_SIZE);
        const results = await Promise.all(
            chunkedKeys.map((chunk) =>
                this.httpService.fetch(`${config.remoteUrl}/admin/professor/values`, {
                    method: "POST",
                    body: JSON.stringify({
                        professorKeys: chunk,
                    }),
                }),
            ),
        );

        const bodies = (await Promise.all(results.map((res) => res.json()))) as string[][];
        const professors2d = bodies.map((arr) => arr.map((t) => JSON.parse(t))) as Teacher[][];
        const professors = professors2d
            .reduce((acc, curr) => acc.concat(curr), [])
            .reduce((acc, curr) => {
                acc[curr.id] = curr;
                return acc;
            }, {} as Record<string, Teacher>);

        const professorKvDump: ProfessorKvDump = {
            data: professors,
            exp: Date.now() + TWO_HOURS,
            retrievedAt: Date.now(),
        };

        this.setLocalProfessorKvDump(professorKvDump);
        return professorKvDump;
    }

    public async recentReviews(): Promise<ConnectedReview[]> {
        const allProfessors = (await this.professorKvDump).data;

        const allReviews: ConnectedReview[] = Object.values(allProfessors).flatMap((professor) =>
            Object.values(professor.reviews ?? [])
                .flat()
                .map(
                    (review) =>
                        ({
                            professorId: professor.id,
                            professorName: `${professor.lastName}, ${professor.firstName}`,
                            ...review,
                            // Have to use any since id is actually on the review and there is no current typing to represent
                            // the data actually stored in the backend
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any),
                ),
        );

        allReviews.sort(
            (reviewA, reviewB) =>
                Date.parse(reviewB.postDate.toString()) - Date.parse(reviewA.postDate.toString()),
        );

        return allReviews;
    }

    public async professorKvDumpUpdatedAt(): Promise<string> {
        const professorKvDump = await this.professorKvDump;
        return new Date(professorKvDump.retrievedAt).toLocaleTimeString("US");
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

    private async getLocalProfessorKvDump(): Promise<ProfessorKvDump | undefined> {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readonly");
        const request = transaction
            .objectStore(POLYRATINGS_OBJECT_STORE)
            .get(PROFESSOR_KV_DUMP_CACHE_KEY);

        return new Promise((resolve) => {
            request.onsuccess = (): void => {
                const localProfessorKvDump: ProfessorKvDump | undefined = request.result;
                if (localProfessorKvDump && Date.now() < localProfessorKvDump.exp) {
                    resolve(localProfessorKvDump);
                } else {
                    resolve(undefined);
                }
            };
        });
    }

    private async setLocalProfessorKvDump(professorKvDump: ProfessorKvDump) {
        const db = await this.databaseConnection;
        const transaction = db.transaction(POLYRATINGS_OBJECT_STORE, "readwrite");
        transaction
            .objectStore(POLYRATINGS_OBJECT_STORE)
            .put(professorKvDump, PROFESSOR_KV_DUMP_CACHE_KEY);
    }
}
