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

    // Sort by the most common department and then by course number

    // Group ratings by department and count occurrences in one pass
    const professorByDepartments = Object.entries(professorData?.reviews || {}).reduce(
        (acc, [course, ratings]) => {
            const obj: CourseRatings = { courseName: course, ratings };
            const [department] = course.split(" ");

            if (!acc[department]) {
                acc[department] = { ratings: [], count: 0 };
            }

            acc[department].ratings.push(obj);
            acc[department].count += obj.ratings.length;

            return acc;
        },
        {} as { [department: string]: { ratings: CourseRatings[]; count: number } },
    );

    // Sort departments by frequency of ratings and within departments by course number
    const sortedProfessorCourses = Object.entries(professorByDepartments)
        .sort(([, a], [, b]) => b.count - a.count) // Sort departments by count (most common first)
        .map(([, { ratings }]) =>
            ratings.sort((a, b) => {
                const [, aNumber] = a.courseName.split(" ");
                const [, bNumber] = b.courseName.split(" ");
                return parseInt(aNumber, 10) - parseInt(bNumber, 10);
            }),
        );

    // Flatten sorted departments into a single array of course ratings
    const sortedCourseRatings = sortedProfessorCourses.flat().map((courseRating) => {
        // Sort ratings by post date within each course
        courseRating.ratings.sort((a, b) => Date.parse(b.postDate) - Date.parse(a.postDate));
        return courseRating;
    });

    return sortedCourseRatings;
}
