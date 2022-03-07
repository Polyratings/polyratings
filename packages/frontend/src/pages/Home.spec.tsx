import { RenderResult, waitFor } from "@testing-library/react";
import { UndoChanges } from "@mindspace-io/react";
import { injector, TeacherService } from "@/services";
import { Home } from ".";
import { renderWithRouter } from "@/test-utils";

const createMockTeacher = (id: string) => ({
    id,
    firstName: "Ben",
    lastName: "Fisher",
    department: "CSC",
    courses: ["CSC 101", "CSC 202"],
    overallRating: 3.2,
    studentDifficulties: 3.9,
    materialClear: 2.9,
    numEvals: 12,
});

// Makes sure that the component has loaded waiting for all professors to load
// Best of the best will be 3 professors and one will be for the featured professor
const componentLoaded = async () => {
    await waitFor(() => documentBody.getAllByText("Fisher", { exact: false }).length === 4);
};

let documentBody: RenderResult;
let undoInjectorChanges: UndoChanges;
describe("<Home />", () => {
    beforeAll(() => {
        undoInjectorChanges = injector.addProviders([
            {
                provide: TeacherService,
                useValue: {
                    getBestTeachers: async () => {
                        await new Promise((resolve) => {
                            setTimeout(resolve, 0);
                        });
                        return [
                            createMockTeacher("1"),
                            createMockTeacher("2"),
                            createMockTeacher("3"),
                        ];
                    },
                },
            },
        ]);
    });

    afterAll(() => {
        undoInjectorChanges();
    });

    beforeEach(() => {
        ({ documentBody } = renderWithRouter(() => <Home />));
    });

    it("has title", async () => {
        await componentLoaded();
        const matches = documentBody.getAllByRole("heading");
        const polyratingsName = matches.find((match) => match.innerHTML === "Polyratings");
        expect(polyratingsName).toBeTruthy();
    });

    it("has featured Teacher", async () => {
        await componentLoaded();
        const matches = documentBody.getAllByRole("heading");
        const polyratingsName = matches.find((match) => match.innerHTML === "Featured Professor");
        expect(polyratingsName).toBeTruthy();
    });

    it("has worst of the worst", async () => {
        await componentLoaded();
        const matches = documentBody.getAllByRole("heading");
        const polyratingsName = matches.find((match) => match.innerHTML === "Best of the Best");
        expect(polyratingsName).toBeTruthy();
    });
});
