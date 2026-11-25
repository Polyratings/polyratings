import { describe, expect, it } from "vitest";
import {
    professorParser,
    professorWriteParser,
    publicProfessorParser,
    truncatedProfessorParser,
    truncatedProfessorWriteParser,
    type Professor,
    type Rating,
} from "@backend/types/schema";
import {
    addRating,
    coursesNeedSync,
    emptyProfessor,
    patchProfessorListCourses,
    patchRating,
    professorToTruncatedProfessor,
    removeRating,
    removeRatingsBulk,
    syncProfessorCourses,
} from "@backend/types/schemaHelpers";
import { isCourseKey } from "@backend/utils/courseNum";
import { ALL_PROFESSOR_KEY } from "@backend/utils/const";
import { KVDAO } from "@backend/dao/kv-dao";
import { KvWrapper } from "@backend/dao/kv-wrapper";

const PROFESSOR_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
let ratingCounter = 0;

function rating(overrides: Partial<Rating> = {}): Rating {
    ratingCounter += 1;
    return {
        id: `00000000-0000-4000-8000-${String(ratingCounter).padStart(12, "0")}`,
        professor: PROFESSOR_ID,
        postDate: "2026-10-01T00:00:00.000Z",
        grade: "A",
        gradeLevel: "Junior",
        courseType: "Elective",
        overallRating: 3,
        presentsMaterialClearly: 4,
        recognizesStudentDifficulties: 2,
        rating: "Great class",
        ...overrides,
    };
}

/** The shape the buggy new-professor path stored: one review, `courses` is the bare department. */
function legacyProfessor(id = PROFESSOR_ID) {
    return {
        id,
        firstName: "Ada",
        lastName: "Lovelace",
        department: "BUS",
        courses: ["BUS"],
        numEvals: 1,
        overallRating: 3,
        materialClear: 4,
        studentDifficulties: 2,
        tags: {},
        reviews: { "BUS 3310": [rating({ professor: id })] },
    };
}

function newProfessor(): Professor {
    return emptyProfessor({
        id: PROFESSOR_ID,
        firstName: "Ada",
        lastName: "Lovelace",
        department: "BUS",
    });
}

describe("isCourseKey", () => {
    it("accepts DEPT NUM keys, including retired departments", () => {
        expect(isCourseKey("BUS 3310")).toBe(true);
        expect(isCourseKey("CSC 357")).toBe(true);
        expect(isCourseKey("SPC 101")).toBe(true);
    });

    it("rejects a bare department and other shapes", () => {
        expect(isCourseKey("BUS")).toBe(false);
        expect(isCourseKey("BUS  3310")).toBe(false);
        expect(isCourseKey("bus 3310")).toBe(false);
        expect(isCourseKey("")).toBe(false);
    });
});

describe("new professor via emptyProfessor + addRating", () => {
    it("keys courses by course, not department", () => {
        const professor = newProfessor();
        addRating(professor, rating({ tags: ["Hybrid Option"] }), "BUS 3310");

        expect(professor.courses).toEqual(["BUS 3310"]);
        expect(professor.numEvals).toBe(1);
        expect(professor.overallRating).toBe(3);
        expect(professor.materialClear).toBe(4);
        expect(professor.studentDifficulties).toBe(2);
        expect(professor.tags).toEqual({ "Hybrid Option": 1 });
        expect(professorWriteParser.safeParse(professor).success).toBe(true);
    });
});

describe("syncProfessorCourses", () => {
    it("sets courses to the review keys", () => {
        const professor = { courses: ["BUS"], reviews: { "BUS 3310": [], "CSC 1001": [] } };
        syncProfessorCourses(professor);
        expect(professor.courses).toEqual(["BUS 3310", "CSC 1001"]);
    });
});

describe("rating mutations keep courses in sync", () => {
    function professorWithTwoCourses() {
        const professor = newProfessor();
        addRating(professor, rating(), "BUS 3310");
        addRating(professor, rating(), "BUS 3310");
        addRating(professor, rating(), "CSC 1001");
        return professor;
    }

    it("removeRating when the bucket keeps other ratings", () => {
        const professor = professorWithTwoCourses();
        professor.courses = ["stale"];
        removeRating(professor, professor.reviews["BUS 3310"][0].id);
        expect(professor.courses).toEqual(["BUS 3310", "CSC 1001"]);
    });

    it("removeRating when the bucket empties", () => {
        const professor = professorWithTwoCourses();
        removeRating(professor, professor.reviews["CSC 1001"][0].id);
        expect(professor.courses).toEqual(["BUS 3310"]);
    });

    it("removeRatingsBulk", () => {
        const professor = professorWithTwoCourses();
        removeRatingsBulk(professor, [professor.reviews["CSC 1001"][0].id]);
        expect(professor.courses).toEqual(["BUS 3310"]);
    });

    it("patchRating moving a rating to a new course", () => {
        const professor = professorWithTwoCourses();
        patchRating(professor, professor.reviews["CSC 1001"][0].id, { course: "CSC 2001" });
        expect(professor.courses).toEqual(["BUS 3310", "CSC 2001"]);
    });
});

describe("professorWriteParser", () => {
    it("rejects the legacy bare-department courses", () => {
        const result = professorWriteParser.safeParse(legacyProfessor());
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path).toEqual(["courses"]);
    });

    it("rejects courses missing a review key", () => {
        const professor = { ...legacyProfessor(), courses: [] };
        expect(professorWriteParser.safeParse(professor).success).toBe(false);
    });

    it("rejects duplicate courses", () => {
        const professor = { ...legacyProfessor(), courses: ["BUS 3310", "BUS 3310"] };
        expect(professorWriteParser.safeParse(professor).success).toBe(false);
    });

    it("rejects a review bucket that is not a course key, even when courses matches it", () => {
        const professor = { ...legacyProfessor(), reviews: { BUS: [rating()] } };
        const result = professorWriteParser.safeParse(professor);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path).toEqual(["reviews", "BUS"]);
    });

    it("accepts courses in any order", () => {
        const professor = {
            ...legacyProfessor(),
            courses: ["CSC 1001", "BUS 3310"],
            reviews: { "BUS 3310": [rating()], "CSC 1001": [rating()] },
        };
        expect(professorWriteParser.safeParse(professor).success).toBe(true);
    });
});

describe("read parsers accept legacy records", () => {
    it("professorParser reads courses: ['BUS'] and derives the review keys", () => {
        const professor = professorParser.parse(legacyProfessor());
        expect(professor.courses).toEqual(["BUS 3310"]);
        expect(professorWriteParser.safeParse(professor).success).toBe(true);
    });

    it("publicProfessorParser derives courses too", () => {
        expect(publicProfessorParser.parse(legacyProfessor()).courses).toEqual(["BUS 3310"]);
    });

    it("truncatedProfessorParser still reads a legacy list entry", () => {
        const { reviews: _reviews, ...entry } = legacyProfessor();
        expect(truncatedProfessorParser.parse(entry).courses).toEqual(["BUS"]);
        expect(truncatedProfessorWriteParser.safeParse(entry).success).toBe(false);
    });
});

describe("professorToTruncatedProfessor", () => {
    it("derives courses from reviews even when the professor's courses is stale", () => {
        const professor = legacyProfessor() as Professor;
        const truncated = professorToTruncatedProfessor(professor);
        expect(truncated.courses).toEqual(["BUS 3310"]);
        expect(truncatedProfessorWriteParser.safeParse(truncated).success).toBe(true);
    });
});

describe("coursesNeedSync", () => {
    it("flags mismatches and ignores order", () => {
        expect(coursesNeedSync(legacyProfessor())).toBe(true);
        expect(coursesNeedSync({ courses: ["B 1", "A 1"], reviews: { "A 1": 1, "B 1": 1 } })).toBe(
            false,
        );
        expect(coursesNeedSync({ courses: ["MATH", "MATH 142"], reviews: { "MATH 142": 1 } })).toBe(
            true,
        );
    });
});

describe("patchProfessorListCourses", () => {
    it("changes only courses on matching entries and reports missing ids", () => {
        const { reviews: _reviews, ...entry } = legacyProfessor();
        const list = [truncatedProfessorParser.parse(entry)];
        const before = { ...list[0] };
        const result = patchProfessorListCourses(
            list,
            new Map([
                [PROFESSOR_ID, ["BUS 3310"]],
                [OTHER_ID, ["CSC 1001"]],
            ]),
        );
        expect(result).toEqual({ updatedIds: [PROFESSOR_ID], missingIds: [OTHER_ID] });
        expect(list[0]).toEqual({ ...before, courses: ["BUS 3310"] });
    });

    it("leaves entries that already match", () => {
        const { reviews: _reviews, ...entry } = legacyProfessor();
        const list = [truncatedProfessorParser.parse({ ...entry, courses: ["BUS 3310"] })];
        const result = patchProfessorListCourses(list, new Map([[PROFESSOR_ID, ["BUS 3310"]]]));
        expect(result.updatedIds).toEqual([]);
    });
});

/** In-memory stand-in for the slice of KVNamespace that KvWrapper uses. */
class MemoryKv {
    store = new Map<string, string>();

    puts: string[] = [];

    get(key: string) {
        const value = this.store.get(key);
        return Promise.resolve(value === undefined ? null : JSON.parse(value));
    }

    put(key: string, value: string) {
        this.puts.push(key);
        this.store.set(key, value);
        return Promise.resolve();
    }

    delete(key: string) {
        this.store.delete(key);
        return Promise.resolve();
    }

    list({ cursor, limit = 1000 }: { cursor?: string; limit?: number } = {}) {
        const keys = [...this.store.keys()].sort();
        const start = cursor ? Number(cursor) : 0;
        const end = Math.min(start + limit, keys.length);
        const complete = end >= keys.length;
        return Promise.resolve({
            keys: keys.slice(start, end).map((name) => ({ name })),
            list_complete: complete,
            cursor: complete ? undefined : String(end),
        });
    }
}

function setupDao() {
    const kv = new MemoryKv();
    const wrap = (namespace: MemoryKv) => new KvWrapper(namespace as never);
    const dao = new KVDAO(
        wrap(kv),
        wrap(new MemoryKv()),
        wrap(new MemoryKv()),
        wrap(new MemoryKv()),
        wrap(new MemoryKv()),
    );

    const legacy = legacyProfessor();
    const good = { ...legacyProfessor(OTHER_ID), courses: ["BUS 3310"], firstName: "Grace" };
    kv.store.set(PROFESSOR_ID, JSON.stringify(legacy));
    kv.store.set(OTHER_ID, JSON.stringify(good));
    const list = [legacy, good].map(({ reviews: _reviews, ...entry }) => entry);
    kv.store.set(ALL_PROFESSOR_KEY, JSON.stringify(list));
    kv.puts = [];
    return { kv, dao };
}

function storedCourses(kv: MemoryKv, key: string) {
    return (JSON.parse(kv.store.get(key)!) as { courses: string[] }).courses;
}

function listCourses(kv: MemoryKv) {
    const list = JSON.parse(kv.store.get(ALL_PROFESSOR_KEY)!) as {
        id: string;
        courses: string[];
    }[];
    return Object.fromEntries(list.map((entry) => [entry.id, entry.courses]));
}

describe("KVDAO reads and writes", () => {
    it("getProfessor returns derived courses for a legacy record", async () => {
        const { dao } = setupDao();
        expect((await dao.getProfessor(PROFESSOR_ID)).courses).toEqual(["BUS 3310"]);
    });

    it("putProfessor refuses a professor whose courses does not match its reviews", async () => {
        const { kv, dao } = setupDao();
        const professor = await dao.getProfessor(OTHER_ID);
        professor.courses = ["BUS"];
        await expect(dao.putProfessor(professor)).rejects.toThrow("must equal the review keys");
        expect(kv.puts).toEqual([]);
    });

    it("putProfessor writes derived courses into the list", async () => {
        const { kv, dao } = setupDao();
        await dao.putProfessor(await dao.getProfessor(PROFESSOR_ID));
        expect(storedCourses(kv, PROFESSOR_ID)).toEqual(["BUS 3310"]);
        expect(listCourses(kv)[PROFESSOR_ID]).toEqual(["BUS 3310"]);
    });

    it("putPendingProfessor refuses the legacy shape", async () => {
        const { dao } = setupDao();
        await expect(
            dao.putPendingProfessor(legacyProfessor() as unknown as Professor),
        ).rejects.toThrow("must equal the review keys");
    });
});

describe("KVDAO.backfillProfessorCourses", () => {
    it("dry run reports the change without writing", async () => {
        const { kv, dao } = setupDao();
        const result = await dao.backfillProfessorCourses({ limit: 10, dryRun: true });
        expect(result).toEqual({
            dryRun: true,
            scanned: 2,
            changes: [
                {
                    id: PROFESSOR_ID,
                    name: "Lovelace, Ada",
                    before: ["BUS"],
                    after: ["BUS 3310"],
                },
            ],
            problems: [],
            nextCursor: null,
        });
        expect(kv.puts).toEqual([]);
    });

    it("pages with a cursor and rewrites only mismatched records, never the list", async () => {
        const { kv, dao } = setupDao();
        // Sorted keys: PROFESSOR_ID (1111…), OTHER_ID (2222…), "all".
        const first = await dao.backfillProfessorCourses({ limit: 1, dryRun: false });
        expect(first.changes.map((change) => change.id)).toEqual([PROFESSOR_ID]);
        expect(first.nextCursor).toBe("1");

        const second = await dao.backfillProfessorCourses({
            cursor: first.nextCursor!,
            limit: 2,
            dryRun: false,
        });
        expect(second.scanned).toBe(1);
        expect(second.changes).toEqual([]);
        expect(second.nextCursor).toBeNull();

        expect(kv.puts).toEqual([PROFESSOR_ID]);
        expect(storedCourses(kv, PROFESSOR_ID)).toEqual(["BUS 3310"]);
        expect(listCourses(kv)[PROFESSOR_ID]).toEqual(["BUS"]);
    });
});

describe("KVDAO.repairProfessorListCourses", () => {
    it("dry run reports list changes without writing", async () => {
        const { kv, dao } = setupDao();
        const result = await dao.repairProfessorListCourses({ dryRun: true });
        expect(result).toEqual({
            dryRun: true,
            listSize: 2,
            candidates: 1,
            processed: 1,
            remaining: 0,
            changes: [
                {
                    id: PROFESSOR_ID,
                    name: "Lovelace, Ada",
                    before: ["BUS"],
                    after: ["BUS 3310"],
                },
            ],
            professorNotFound: [],
            listEntryMissing: [],
            problems: [],
        });
        expect(kv.puts).toEqual([]);
    });

    it("fixes the list with a single write and leaves other entries alone", async () => {
        const { kv, dao } = setupDao();
        const result = await dao.repairProfessorListCourses({ dryRun: false });
        expect(result.changes.map((change) => change.id)).toEqual([PROFESSOR_ID]);
        expect(kv.puts).toEqual([ALL_PROFESSOR_KEY]);
        expect(listCourses(kv)).toEqual({
            [PROFESSOR_ID]: ["BUS 3310"],
            [OTHER_ID]: ["BUS 3310"],
        });

        const again = await dao.repairProfessorListCourses({ dryRun: false });
        expect(again.candidates).toBe(0);
        expect(kv.puts).toEqual([ALL_PROFESSOR_KEY]);
    });

    it("reports list entries whose professor record is gone", async () => {
        const { kv, dao } = setupDao();
        kv.store.delete(PROFESSOR_ID);
        const result = await dao.repairProfessorListCourses({ dryRun: false });
        expect(result.professorNotFound).toEqual([PROFESSOR_ID]);
        expect(result.changes).toEqual([]);
        expect(kv.puts).toEqual([]);
    });
});
