import { useInjectorHook } from "@mindspace-io/react";
import { Teacher } from "@polyratings/shared";
import { HttpService, injectorFactory, StorageService, TeacherService } from ".";
import { TEACHER_CACHE_TIME } from "./teacher.service";

const mockAllTeachers: Teacher[] = [
    {
        id: "12-52",
        firstName: "Max",
        lastName: "Fisher",
        department: "CSC",
        overallRating: 4,
        studentDifficulties: 3.5,
        materialClear: 3,
        numEvals: 1,
        courses: ["CSC 101"],
    },
    {
        id: "901-2134",
        firstName: "Ben",
        lastName: "Miller",
        department: "BIO",
        overallRating: 2.5,
        studentDifficulties: 1.2,
        materialClear: 3,
        numEvals: 5,
        courses: ["BIO 103", "BIO 248"],
    },
];

const mockTeacher: Teacher = {
    id: mockAllTeachers[0].id,
    firstName: mockAllTeachers[0].firstName,
    lastName: mockAllTeachers[0].lastName,
    department: mockAllTeachers[0].department,
    overallRating: mockAllTeachers[0].overallRating,
    studentDifficulties: mockAllTeachers[0].studentDifficulties,
    materialClear: mockAllTeachers[0].materialClear,
    numEvals: mockAllTeachers[0].numEvals,
    courses: mockAllTeachers[0].courses,
    reviews: {
        "CSC 101": [
            {
                id: "review-id",
                grade: "A",
                gradeLevel: "Junior",
                courseType: "Major (Required)",
                rating: "MY RATING BODY",
                // TODO: Find a better way of representing dates
                // Make the mock date a string to comply with JSON stringify
                postDate: new Date().toString() as never,
            },
        ],
    },
};

let fetchCount = 0;
let beforeTestFetchCount = 0;
async function mockFetch(target: string) {
    fetchCount += 1;
    if (target.endsWith("professors")) {
        return new Response(JSON.stringify(mockAllTeachers));
    }
    return new Response(JSON.stringify(mockTeacher));
}

async function createTeacherService(clearStorage: boolean): Promise<TeacherService> {
    beforeTestFetchCount = fetchCount;

    // Create a new injector each test to fully reset state
    const injector = injectorFactory();
    injector.addProviders([
        {
            provide: HttpService,
            useValue: { fetch: mockFetch },
        },
    ]);

    if (clearStorage) {
        const [storageService] = useInjectorHook(StorageService, injector) as unknown as [
            StorageService,
        ];
        await storageService.clearAllStorage();
    }

    const [teacherService] = useInjectorHook(TeacherService, injector);
    return teacherService;
}

let teacherService: TeacherService;
describe("Teacher Service", () => {
    beforeEach(async () => {
        teacherService = await createTeacherService(true);
    });

    it("Can get all teachers", async () => {
        const allTeachers = await teacherService.getAllTeachers();
        expect(allTeachers).toEqual(mockAllTeachers);
    });

    it("Should not have multiple fetch calls for all teachers", async () => {
        await teacherService.getAllTeachers();
        await teacherService.getAllTeachers();
        expect(beforeTestFetchCount + 1).toBe(fetchCount);
    });

    it("Loads all teachers from a cache if not expired", async () => {
        await teacherService.getAllTeachers();
        const currentFetch = fetchCount;
        const newTeacherService = await createTeacherService(false);
        await newTeacherService.getAllTeachers();
        expect(currentFetch).toBe(fetchCount);
    });

    it("Refetch all teachers if expired", async () => {
        await teacherService.getAllTeachers();
        const currentFetch = fetchCount;

        const currentDate = Date.now();
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => currentDate + TEACHER_CACHE_TIME + 5);

        const newTeacherService = await createTeacherService(false);
        await newTeacherService.getAllTeachers();
        expect(currentFetch + 1).toBe(fetchCount);

        dateNowSpy.mockRestore();
    });

    it("Should fetch a teacher", async () => {
        const teacher = await teacherService.getTeacher(mockTeacher.id);
        expect(teacher).toEqual(mockTeacher);
    });

    it("Should only fetch a teacher once", async () => {
        // Wait for all teachers to be loaded once
        await teacherService.getAllTeachers();
        const currentFetchCount = fetchCount;
        await teacherService.getTeacher(mockTeacher.id);
        await teacherService.getTeacher(mockTeacher.id);
        expect(currentFetchCount + 1).toBe(fetchCount);
    });

    it("Should keep teacher between instances", async () => {
        // Wait for all teachers since that is automatically kicked off
        await teacherService.getAllTeachers();
        await teacherService.getTeacher(mockTeacher.id);
        const currentFetch = fetchCount;

        const newTeacherService = await createTeacherService(false);
        await newTeacherService.getTeacher(mockTeacher.id);

        expect(currentFetch).toBe(fetchCount);
    });

    it("Refetch teacher if expired", async () => {
        // Wait for all teachers since that is automatically kicked off
        await teacherService.getAllTeachers();
        await teacherService.getTeacher(mockTeacher.id);
        const currentFetch = fetchCount;

        const newTeacherService = await createTeacherService(false);
        await newTeacherService.getAllTeachers();

        const currentDate = Date.now();
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => currentDate + TEACHER_CACHE_TIME + 5);

        await teacherService.getTeacher(mockTeacher.id);
        expect(currentFetch + 1).toBe(fetchCount);

        dateNowSpy.mockRestore();
    });

    it("Can search by name", async () => {
        // FirstName LastName
        let searchResults = await teacherService.searchForTeacher(
            "name",
            `${mockTeacher.firstName} ${mockTeacher.lastName}`,
        );
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);

        // LastName FirstName
        searchResults = await teacherService.searchForTeacher(
            "name",
            `${mockTeacher.lastName} ${mockTeacher.firstName}`,
        );
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);

        // LastName only
        searchResults = await teacherService.searchForTeacher("name", `${mockTeacher.lastName}`);
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);

        // FirstName only
        searchResults = await teacherService.searchForTeacher("name", `${mockTeacher.firstName}`);
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);
    });

    it("Can search by class", async () => {
        const searchResults = await teacherService.searchForTeacher(
            "class",
            mockAllTeachers[0].courses[0],
        );
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);
    });

    it("Can search by department", async () => {
        const searchResults = await teacherService.searchForTeacher(
            "department",
            mockAllTeachers[0].department,
        );
        expect(searchResults[0]).toEqual(mockAllTeachers[0]);
    });

    it("Fires fetch when adding a new teacher", async () => {
        await teacherService.getAllTeachers();
        const currentFetchCount = fetchCount;
        await teacherService.addNewTeacher({} as never);
        expect(fetchCount).toBe(currentFetchCount + 1);
    });
});
