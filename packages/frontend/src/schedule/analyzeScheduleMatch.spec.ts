import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    analyzeScheduleMatch,
    notApplicableMatch,
    parseSubmittedCourseKey,
    reusableScheduleMatch,
    unavailableMatch,
} from "@backend/schedule/analyzeScheduleMatch";
import { ScheduleApiClient } from "@backend/schedule/client";

const BASE_URL = "https://schedule.example.test/";
const API_KEY = "test-read-key";
const POST_DATE = "2026-10-15T18:00:00.000Z";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function stubFetch(response: () => Response | Promise<Response>) {
    fetchMock.mockImplementation(async () => response());
    vi.stubGlobal("fetch", fetchMock);
}

function analyze(
    client = new ScheduleApiClient(BASE_URL, API_KEY),
    postDate = POST_DATE,
    firstName = "Ada",
) {
    return analyzeScheduleMatch({
        client,
        firstName,
        lastName: "Lovelace",
        department: "csc",
        courseNum: 1101,
        postDate,
    });
}

function requestUrl(): URL {
    const [input] = fetchMock.mock.calls[0];
    return new URL(input instanceof Request ? input.url : input);
}

const COURSE_MATCH_PATH = "/v1/instructors/course-match";

describe("analyzeScheduleMatch", () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function expectNoNamesLogged() {
        for (const call of [...errorSpy.mock.calls, ...warnSpy.mock.calls]) {
            const line = call.map(String).join(" ");
            expect(line).not.toMatch(/Ada|Lovelace|postedAt|\?/);
        }
    }

    it("makes one course-match request with the rating's course and post date", async () => {
        stubFetch(() =>
            jsonResponse({
                status: "confirmed",
                termCodesChecked: ["2262", "2268"],
                matchedCourseKeys: ["CSC 1101"],
            }),
        );

        await analyze();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [requestUrl, init] = fetchMock.mock.calls[0];
        const url = new URL(requestUrl instanceof Request ? requestUrl.url : requestUrl);
        expect(url.origin + url.pathname).toBe(
            "https://schedule.example.test/v1/instructors/course-match",
        );
        expect(Object.fromEntries(url.searchParams)).toEqual({
            firstName: "Ada",
            lastName: "Lovelace",
            subject: "CSC",
            catalogNumber: "1101",
            postedAt: POST_DATE,
        });
        expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${API_KEY}`);
    });

    it("sends legacy Date#toString() post dates as ISO 8601", async () => {
        stubFetch(() =>
            jsonResponse({ status: "not_applicable", termCodesChecked: [], matchedCourseKeys: [] }),
        );

        await analyze(undefined, "Thu Mar 20 2025 20:01:32 GMT+0000 (Coordinated Universal Time)");

        const [requestUrl] = fetchMock.mock.calls[0];
        const url = new URL(requestUrl instanceof Request ? requestUrl.url : requestUrl);
        expect(url.searchParams.get("postedAt")).toBe("2025-03-20T20:01:32.000Z");
    });

    it("treats an unparseable post date as outside schedule data without a request", async () => {
        stubFetch(() => jsonResponse({}));

        await expect(analyze(undefined, "not-a-date")).resolves.toEqual(
            notApplicableMatch("CSC 1101"),
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["confirmed", "course_not_taught", "not_applicable"] as const)(
        "maps a %s response through",
        async (status) => {
            const matchedCourseKeys = status === "not_applicable" ? [] : ["CSC 2202"];
            stubFetch(() =>
                jsonResponse({ status, termCodesChecked: ["2262", "2268"], matchedCourseKeys }),
            );

            await expect(analyze()).resolves.toEqual({
                status,
                termCodesChecked: ["2262", "2268"],
                matchedCourseKeys,
                submittedCourseKey: "CSC 1101",
            });
        },
    );

    it.each(["", "   "])("omits a blank firstName (%j) from the request", async (firstName) => {
        stubFetch(() =>
            jsonResponse({ status: "confirmed", termCodesChecked: [], matchedCourseKeys: [] }),
        );

        await analyze(undefined, POST_DATE, firstName);

        expect(requestUrl().searchParams.has("firstName")).toBe(false);
        expect(requestUrl().searchParams.get("lastName")).toBe("Lovelace");
    });

    it("tolerates extra response fields and drops them", async () => {
        stubFetch(() =>
            jsonResponse({
                status: "confirmed",
                termCodesChecked: ["2268"],
                matchedCourseKeys: ["CSC 1101"],
                matchedInstructors: [{ firstName: "Ada", lastName: "Lovelace" }],
            }),
        );

        await expect(analyze()).resolves.toEqual({
            status: "confirmed",
            termCodesChecked: ["2268"],
            matchedCourseKeys: ["CSC 1101"],
            submittedCourseKey: "CSC 1101",
        });
    });

    it.each([201, 500, 502, 503])(
        "returns unavailable on a %i response without an error log",
        async (status) => {
            stubFetch(() =>
                jsonResponse(
                    status === 503
                        ? { error: "Index incomplete", termCodesSkipped: ["2268"] }
                        : { status: "confirmed", termCodesChecked: [], matchedCourseKeys: [] },
                    status,
                ),
            );

            await expect(analyze()).resolves.toEqual(unavailableMatch("CSC 1101"));
            expect(errorSpy).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toContain(`HTTP ${status}`);
            expectNoNamesLogged();
        },
    );

    it.each([400, 401, 403, 404, 422])(
        "returns unavailable and logs a client error once on a %i response",
        async (status) => {
            stubFetch(() => jsonResponse({ error: "bad request" }, status));

            await expect(analyze()).resolves.toEqual(unavailableMatch("CSC 1101"));
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy.mock.calls[0][0]).toContain(`HTTP ${status}`);
            expect(errorSpy.mock.calls[0][0]).toContain(COURSE_MATCH_PATH);
            expectNoNamesLogged();
        },
    );

    it("does not log a client error for the 400 an empty first name can still get", async () => {
        stubFetch(() => jsonResponse({ error: "firstName and lastName are required" }, 400));

        await expect(analyze(undefined, POST_DATE, "")).resolves.toEqual(
            unavailableMatch("CSC 1101"),
        );
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("returns unavailable when the request times out", async () => {
        fetchMock.mockImplementation(
            (_input, init) =>
                new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
                }),
        );
        vi.stubGlobal("fetch", fetchMock);

        await expect(analyze(new ScheduleApiClient(BASE_URL, API_KEY, 20))).resolves.toEqual(
            unavailableMatch("CSC 1101"),
        );
        expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("timed out after 20ms");
        expectNoNamesLogged();
    });

    it("returns unavailable on a network error", async () => {
        stubFetch(() => {
            throw new TypeError("network down");
        });

        await expect(analyze()).resolves.toEqual(unavailableMatch("CSC 1101"));
    });

    it.each([
        ["an unknown status", { status: "maybe", termCodesChecked: [], matchedCourseKeys: [] }],
        ["missing fields", { status: "confirmed" }],
        ["a non-object body", ["confirmed"]],
    ])("returns unavailable on a malformed body (%s)", async (_label, body) => {
        stubFetch(() => jsonResponse(body));

        await expect(analyze()).resolves.toEqual(unavailableMatch("CSC 1101"));
    });

    it("returns unavailable on a non-JSON body", async () => {
        stubFetch(() => new Response("<html>oops</html>", { status: 200 }));

        await expect(analyze()).resolves.toEqual(unavailableMatch("CSC 1101"));
    });

    it.each([
        ["no base URL", undefined, API_KEY],
        ["no API key", BASE_URL, undefined],
        ["a blank API key", BASE_URL, "  "],
    ])("makes no request when not configured (%s)", async (_label, baseUrl, apiKey) => {
        stubFetch(() => jsonResponse({}));

        await expect(analyze(new ScheduleApiClient(baseUrl, apiKey))).resolves.toEqual(
            unavailableMatch("CSC 1101"),
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("reusableScheduleMatch", () => {
    it("treats a stored unavailable result as missing so it is re-checked", () => {
        expect(reusableScheduleMatch(unavailableMatch("CSC 1101"))).toBeUndefined();
    });

    it("treats no stored result as missing", () => {
        expect(reusableScheduleMatch(undefined)).toBeUndefined();
    });

    it.each(["confirmed", "course_not_taught", "not_applicable"] as const)(
        "reuses a stored %s result",
        (status) => {
            const stored = {
                status,
                termCodesChecked: ["2268"],
                matchedCourseKeys: [],
                submittedCourseKey: "CSC 1101",
            };
            expect(reusableScheduleMatch(stored)).toBe(stored);
        },
    );
});

describe("parseSubmittedCourseKey", () => {
    it("parses a department and course number", () => {
        expect(parseSubmittedCourseKey(" csc 1101 ")).toEqual({
            department: "CSC",
            courseNum: 1101,
        });
    });

    it("rejects keys that are not a department and number", () => {
        expect(parseSubmittedCourseKey("CSC")).toBeNull();
        expect(parseSubmittedCourseKey("CSC 11A")).toBeNull();
    });
});
