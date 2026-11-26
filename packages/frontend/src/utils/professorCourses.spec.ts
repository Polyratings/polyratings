import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
    professorObjectParser,
    professorParser,
    publicProfessorParser,
    truncatedProfessorParser,
    type Professor,
    type Rating,
} from "@backend/types/schema";
import {
    addRating,
    emptyProfessor,
    patchRating,
    professorToTruncatedProfessor,
    removeRating,
    removeRatingsBulk,
    syncProfessorCourses,
} from "@backend/types/schemaHelpers";
import { courseKeyParser } from "@backend/utils/courseNum";
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

describe("courseKeyParser", () => {
    it("normalizes a current department with a quarter or semester number", () => {
        expect(courseKeyParser.parse(" csc  1001 ")).toBe("CSC 1001");
        expect(courseKeyParser.parse("BUS 357")).toBe("BUS 357");
    });

    it("rejects a bare department, unknown departments and bad numbers", () => {
        expect(courseKeyParser.safeParse("BUS").success).toBe(false);
        expect(courseKeyParser.safeParse("NOPE 1001").success).toBe(false);
        expect(courseKeyParser.safeParse("CSC 99").success).toBe(false);
        expect(courseKeyParser.safeParse("CSC 1001 extra").success).toBe(false);
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

describe("professor parsers derive courses", () => {
    it("professorParser reads courses: ['BUS'] and derives the review keys", () => {
        expect(professorParser.parse(legacyProfessor()).courses).toEqual(["BUS 3310"]);
    });

    it("professorParser drops a bare department mixed with real courses", () => {
        const professor = { ...legacyProfessor(), courses: ["BUS", "BUS 3310"] };
        expect(professorParser.parse(professor).courses).toEqual(["BUS 3310"]);
    });

    it("professorParser accepts review keys with retired departments", () => {
        const professor = { ...legacyProfessor(), reviews: { "SPC 101": [rating()] } };
        expect(professorParser.parse(professor).courses).toEqual(["SPC 101"]);
    });

    it("publicProfessorParser derives courses too", () => {
        expect(publicProfessorParser.parse(legacyProfessor()).courses).toEqual(["BUS 3310"]);
    });

    it("truncatedProfessorParser still reads a legacy list entry", () => {
        const { reviews: _reviews, ...entry } = legacyProfessor();
        expect(truncatedProfessorParser.parse(entry).courses).toEqual(["BUS"]);
    });

    it("professorParser stays extendable with new keys", () => {
        const extended = professorParser.extend({ note: z.string().optional() });
        expect(extended.parse(legacyProfessor()).courses).toEqual(["BUS 3310"]);
    });

    it("professorObjectParser can override keys, and does not derive", () => {
        const extended = professorObjectParser.extend({ courses: z.string().array().max(5) });
        expect(extended.parse(legacyProfessor()).courses).toEqual(["BUS"]);
    });
});

describe("professorToTruncatedProfessor", () => {
    it("derives courses from reviews even when the professor's courses is stale", () => {
        const professor = legacyProfessor() as Professor;
        const truncated = professorToTruncatedProfessor(professor);
        expect(truncated.courses).toEqual(["BUS 3310"]);
    });
});

/** In-memory stand-in for the slice of KVNamespace that KvWrapper uses. */
class MemoryKv {
    store = new Map<string, string>();

    get(key: string) {
        const value = this.store.get(key);
        return Promise.resolve(value === undefined ? null : JSON.parse(value));
    }

    put(key: string, value: string) {
        this.store.set(key, value);
        return Promise.resolve();
    }

    delete(key: string) {
        this.store.delete(key);
        return Promise.resolve();
    }
}

function setupDao() {
    const kv = new MemoryKv();
    const pendingKv = new MemoryKv();
    const wrap = (namespace: MemoryKv) => new KvWrapper(namespace as never);
    const dao = new KVDAO(
        wrap(kv),
        wrap(new MemoryKv()),
        wrap(new MemoryKv()),
        wrap(pendingKv),
        wrap(new MemoryKv()),
    );

    const legacy = legacyProfessor();
    const good = { ...legacyProfessor(OTHER_ID), courses: ["BUS 3310"], firstName: "Grace" };
    kv.store.set(PROFESSOR_ID, JSON.stringify(legacy));
    kv.store.set(OTHER_ID, JSON.stringify(good));
    const list = [legacy, good].map(({ reviews: _reviews, ...entry }) => entry);
    kv.store.set(ALL_PROFESSOR_KEY, JSON.stringify(list));
    return { kv, pendingKv, dao };
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

    it("putProfessor stores derived courses when the in-memory courses is stale", async () => {
        const { kv, dao } = setupDao();
        const professor = await dao.getProfessor(OTHER_ID);
        professor.courses = ["BUS"];
        await dao.putProfessor(professor);
        expect(storedCourses(kv, OTHER_ID)).toEqual(["BUS 3310"]);
        expect(listCourses(kv)[OTHER_ID]).toEqual(["BUS 3310"]);
    });

    it("putProfessor fixes a legacy list entry", async () => {
        const { kv, dao } = setupDao();
        expect(listCourses(kv)[PROFESSOR_ID]).toEqual(["BUS"]);
        await dao.putProfessor(await dao.getProfessor(PROFESSOR_ID));
        expect(storedCourses(kv, PROFESSOR_ID)).toEqual(["BUS 3310"]);
        expect(listCourses(kv)).toEqual({
            [PROFESSOR_ID]: ["BUS 3310"],
            [OTHER_ID]: ["BUS 3310"],
        });
    });

    it("putPendingProfessor stores derived courses for the legacy shape", async () => {
        const { pendingKv, dao } = setupDao();
        await dao.putPendingProfessor(legacyProfessor() as unknown as Professor);
        expect(storedCourses(pendingKv, PROFESSOR_ID)).toEqual(["BUS 3310"]);
    });
});
