import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScheduleMatch } from "@backend/schedule/schema";
import { ScheduleMatchBadge } from "@/pages/admin/ScheduleMatchBadge";

function scheduleMatch(
    overrides: Partial<ScheduleMatch> & Pick<ScheduleMatch, "status">,
): ScheduleMatch {
    return {
        termCodesChecked: ["2268"],
        matchedCourseKeys: [],
        submittedCourseKey: "CSC 1101",
        ...overrides,
    };
}

describe("ScheduleMatchBadge", () => {
    it("renders a dash when the log has no schedule match metadata", () => {
        render(<ScheduleMatchBadge scheduleMatch={undefined} />);
        expect(screen.getByText("—")).toBeTruthy();
    });

    it("shows a mismatch and the courses they did teach", () => {
        render(
            <ScheduleMatchBadge
                scheduleMatch={scheduleMatch({
                    status: "course_not_taught",
                    matchedCourseKeys: ["CSC 202", "CSC 349"],
                })}
            />,
        );
        expect(screen.getByText("Not on their schedule")).toBeTruthy();
        expect(screen.getByText("Taught: CSC 202, CSC 349")).toBeTruthy();
    });

    it("shows a quiet confirmed label", () => {
        render(<ScheduleMatchBadge scheduleMatch={scheduleMatch({ status: "confirmed" })} />);
        expect(screen.getByText("On their schedule")).toBeTruthy();
    });
});
