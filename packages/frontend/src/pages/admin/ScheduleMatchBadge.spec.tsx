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

    it("keeps a mismatch label on one line", () => {
        render(
            <ScheduleMatchBadge
                scheduleMatch={scheduleMatch({
                    status: "course_not_taught",
                    matchedCourseKeys: ["CSC 202", "CSC 349"],
                })}
            />,
        );
        const label = screen.getByText("Not on their schedule");
        expect(label.className).toContain("whitespace-nowrap");
    });

    it("shows a quiet confirmed label", () => {
        render(<ScheduleMatchBadge scheduleMatch={scheduleMatch({ status: "confirmed" })} />);
        expect(screen.getByText("On their schedule")).toBeTruthy();
    });
});
