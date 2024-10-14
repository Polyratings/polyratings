import { Professor, Rating, ratingParser, TruncatedProfessor } from "./schema";

export function addRating(professor: Professor, reviewUnparsed: Rating, courseName: string) {
    // Ensure that no extraneous keys are present
    // Unsure if this is actually needed since the kv put may strip anyways
    const review = ratingParser.parse(reviewUnparsed);

    // Ensure that the review has the correct professor id
    review.professor = professor.id;

    // For migration purposes from old schema
    professor.tags ??= {};

    // Add tags to the professor
    for (const tag of review.tags ?? []) {
        const current = professor.tags[tag] ?? 0;
        professor.tags[tag] = current + 1;
    }

    const ratings = professor.reviews[courseName];
    if (!ratings) {
        professor.reviews[courseName] = [review];
    } else {
        ratings.push(review);
    }

    // Ensure that courses value is up to date
    professor.courses = Object.keys(professor.reviews);

    const newMaterial =
        (professor.materialClear * professor.numEvals + review.presentsMaterialClearly) /
        (professor.numEvals + 1);
    const newStudentDiff =
        (professor.studentDifficulties * professor.numEvals +
            review.recognizesStudentDifficulties) /
        (professor.numEvals + 1);
    const newOverall =
        (professor.overallRating * professor.numEvals + review.overallRating) /
        (professor.numEvals + 1);

    professor.numEvals += 1;

    // this properly rounds all of our statistics to the nearest hundredth
    professor.materialClear = roundToPrecision(newMaterial, 2);
    professor.studentDifficulties = roundToPrecision(newStudentDiff, 2);
    professor.overallRating = roundToPrecision(newOverall, 2);
}

export function removeRating(professor: Professor, reviewId: string) {
    const targetCourse = Object.entries(professor.reviews).find(([, courseReviews]) =>
        courseReviews.find((review) => review.id === reviewId),
    );

    if (!targetCourse) {
        throw new Error("Review Does not exist");
    }

    const [courseName, reviews] = targetCourse;

    let removedRating: Rating;
    if (reviews.length === 1) {
        [removedRating] = professor.reviews[courseName];
        delete professor.reviews[courseName];
        // Make sure the courses property is up to date
        professor.courses = Object.keys(professor.reviews);
    } else {
        // We know professor index is good since we found it previously
        const reviewIndex = reviews.findIndex((review) => review.id === reviewId);
        removedRating = professor.reviews[courseName][reviewIndex];
        // Modifies in place
        professor.reviews[courseName].splice(reviewIndex, 1);
    }

    if (professor.numEvals === 1) {
        professor.materialClear = 0;
        professor.studentDifficulties = 0;
        professor.overallRating = 0;
        professor.numEvals = 0;
    } else {
        // Adjust stats
        const newMaterial =
            (professor.materialClear * professor.numEvals - removedRating.presentsMaterialClearly) /
            (professor.numEvals - 1);
        const newStudentDiff =
            (professor.studentDifficulties * professor.numEvals -
                removedRating.recognizesStudentDifficulties) /
            (professor.numEvals - 1);
        const newOverall =
            (professor.overallRating * professor.numEvals - removedRating.overallRating) /
            (professor.numEvals - 1);

        professor.numEvals -= 1;

        // professor properly rounds all of our statistics to the nearest hundredth
        professor.materialClear = roundToPrecision(newMaterial, 2);
        professor.studentDifficulties = roundToPrecision(newStudentDiff, 2);
        professor.overallRating = roundToPrecision(newOverall, 2);
    }
}

export function professorToTruncatedProfessor({
    id,
    firstName,
    lastName,
    courses,
    numEvals,
    overallRating,
    materialClear,
    studentDifficulties,
}: Professor): TruncatedProfessor {
    return {
        id,
        firstName,
        lastName,
        courses,
        numEvals,
        overallRating,
        materialClear,
        studentDifficulties,
    };
}

function roundToPrecision(roundingTarget: number, precision: number) {
    return Math.round((roundingTarget + Number.EPSILON) * 10 ** precision) / 10 ** precision;
}
