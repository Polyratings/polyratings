import { Review } from "@polyratings/client";
import { render, RenderResult } from "@testing-library/react";
import { ClassSection } from ".";
// TODO: Add tests to report system as well as refactor for easier tests
const mockReviews: Review[] = [
    {
        id: "1",
        gradeLevel: "Senior",
        grade: "A",
        courseType: "Major (Required)",
        rating: "Sample Rating Text 1",
        postDate: new Date(),
    },
    {
        id: "2",
        gradeLevel: "Senior",
        grade: "A",
        courseType: "Major (Required)",
        rating: "Sample Rating Text 2",
        postDate: new Date(),
    },
    {
        id: "3",
        gradeLevel: "Senior",
        grade: "A",
        courseType: "Major (Required)",
        rating: "Sample Rating Text 3",
        postDate: new Date(),
    },
];
const mockTaughtClass = "CSC 357";

let documentBody: RenderResult;
describe("<ClassSection />", () => {
    beforeEach(() => {
        documentBody = render(
            <ClassSection
                professorId="profId"
                reviews={mockReviews}
                taughtClass={mockTaughtClass}
            />,
        );
    });

    it("Displays class name", () => {
        expect(documentBody.getByText(mockTaughtClass)).toBeInTheDocument();
    });

    it("Shows text from first rating", () => {
        expect(documentBody.getByText(mockReviews[0].rating)).toBeInTheDocument();
    });
});
