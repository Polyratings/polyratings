import { AppRouter } from "@backend/index";
import { inferProcedureOutput } from "@trpc/server";
import { ValueOf } from "type-fest";
import { trpc } from "@/trpc";

export interface CourseRatings {
    courseName: string;
    ratings: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>;
}

export function useSortedCourses(professorId: string | undefined) {
    const { data: professorData } = trpc.professors.get.useQuery({
        id: professorId ?? "",
    });

    // Put classes for professors primary department first. This is to cut down on rating spamming
    // of other departments. It is possible for a professor to teach outside of the department but
    // it is ok if those ratings come after the primary department

    // Sort Into Departments
    const professorByDepartments = Object.entries(professorData?.reviews || {}).reduce(
        (acc, [course, ratings]) => {
            const obj: CourseRatings = { courseName: course, ratings };
            const [department] = course.split(" ");
            if (acc[department]) {
                acc[department].push(obj);
            } else {
                acc[department] = [obj];
            }
            return acc;
        },
        {} as { [department: string]: CourseRatings[] },
    );

    // Sort departments by class number
    Object.values(professorByDepartments).forEach((department) =>
        department.sort((a, b) => {
            const [, aNumber] = a.courseName.split(" ");
            const [, bNumber] = b.courseName.split(" ");
            return parseInt(aNumber, 10) - parseInt(bNumber, 10);
        }),
    );

    const primaryClasses = professorByDepartments[professorData?.department ?? ""] ?? [];
    const otherClasses = Object.entries(professorByDepartments)
        .filter(([department]) => department !== professorData?.department)
        .flatMap(([, courseRatings]) => courseRatings);

    const sortedCourseRatings = [...primaryClasses, ...otherClasses].map((courseRating) => {
        // Be carful the array is sorted in place. This is fine here but if moved could cause issues.
        courseRating.ratings.sort((a, b) => Date.parse(b.postDate) - Date.parse(a.postDate));
        return courseRating;
    });

    return sortedCourseRatings;
}
