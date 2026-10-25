import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScheduleMatch } from "@backend/schedule/schema";
import { ScheduleMatchDetail } from "@/pages/admin/ScheduleMatchDetail";

function paragraph(text: string) {
    return (_content: string, element: Element | null) =>
        element?.tagName === "P" && element.textContent?.replace(/\s+/g, " ").trim() === text;
}

function scheduleMatch(overrides: Partial<ScheduleMatch> = {}): ScheduleMatch {
    return {
        status: "course_not_taught",
        termCodesChecked: ["2268"],
        matchedCourseKeys: ["CSC 202", "CSC 349"],
        submittedCourseKey: "CSC 1101",
        ...overrides,
    };
}

describe("ScheduleMatchDetail", () => {
    it("shows the courses taught and the terms that were checked", () => {
        render(<ScheduleMatchDetail scheduleMatch={scheduleMatch()} />);
        expect(screen.getByText("Not on their schedule")).toBeTruthy();
        expect(screen.queryByText("CSC 1101")).toBeNull();
        expect(screen.queryByText(/Scraped/)).toBeNull();
        expect(screen.queryByText("Taught")).toBeNull();
        expect(screen.queryByText("Checked")).toBeNull();
        expect(
            screen.getByText(paragraph("CSC 202, CSC 349 on this schedule fall 2026")),
        ).toBeTruthy();
    });

    it("groups seasons that share a year", () => {
        render(
            <ScheduleMatchDetail
                scheduleMatch={scheduleMatch({
                    termCodesChecked: ["2262", "2264", "2274"],
                })}
            />,
        );
        expect(
            screen.getByText(
                paragraph("CSC 202, CSC 349 on this schedule winter, spring 2026, spring 2027"),
            ),
        ).toBeTruthy();
    });

    it("hides the taught courses when the class is on their schedule", () => {
        render(
            <ScheduleMatchDetail
                scheduleMatch={scheduleMatch({
                    status: "confirmed",
                    matchedCourseKeys: ["EE 1111L", "EE 2328"],
                    termCodesChecked: ["2262", "2264", "2266", "2268"],
                })}
            />,
        );
        expect(screen.getByText("On their schedule")).toBeTruthy();
        expect(screen.queryByText(/on this schedule/)).toBeNull();
        expect(screen.queryByText(/EE 1111L/)).toBeNull();
    });

    it("shows the quarter terms that were checked when no quarter sections were stored", () => {
        render(
            <ScheduleMatchDetail
                scheduleMatch={scheduleMatch({
                    status: "not_applicable",
                    termCodesChecked: ["2262", "2264"],
                    matchedCourseKeys: [],
                    submittedCourseKey: "EE 307",
                })}
            />,
        );
        expect(screen.queryByText("Outside schedule data")).toBeNull();
        expect(screen.queryByText("Not on their schedule")).toBeNull();
        expect(screen.getByText(paragraph("Checked winter, spring 2026"))).toBeTruthy();
    });

    it("renders nothing when no schedule check was stored", () => {
        const { container } = render(<ScheduleMatchDetail scheduleMatch={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });
});
