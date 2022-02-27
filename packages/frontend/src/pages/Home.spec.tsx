import { RenderResult } from "@testing-library/react";
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

// Makes sure that the component has loaded by looking for a single teacher which is gotten on load
const componentLoaded = async () => {
    await documentBody.findAllByText("Fisher", { exact: false });
};

let documentBody: RenderResult;
let undoInjectorChanges: UndoChanges;
describe("<Home />", () => {
    beforeAll(() => {
        undoInjectorChanges = injector.addProviders([
            {
                provide: TeacherService,
                useValue: {
                    getRandomBestTeacher: async () => {
                        // Used in order to allow tests to start before resolving
                        // Prevents act warning
                        await new Promise((resolve) => {
                            setTimeout(resolve, 0);
                        });
                        return createMockTeacher("1");
                    },
                    getRandomWorstTeachers: async () => {
                        await new Promise((resolve) => {
                            setTimeout(resolve, 0);
                        });
                        return [createMockTeacher("2"), createMockTeacher("3")];
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
        const polyratingsName = matches.find((match) => match.innerHTML === "Featured Teacher");
        expect(polyratingsName).toBeTruthy();
    });

    it("has worst of the worst", async () => {
        await componentLoaded();
        const matches = documentBody.getAllByRole("heading");
        const polyratingsName = matches.find((match) => match.innerHTML === "Worst of the Worst");
        expect(polyratingsName).toBeTruthy();
    });

    it("Shows the amount of teachers given by the mock", async () => {
        await componentLoaded();
        const matches = await documentBody.findAllByText("Fisher", { exact: false });
        expect(matches).toHaveLength(3);
    });
});
