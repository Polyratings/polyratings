import { Professor, Rating, ratingParser, TruncatedProfessor } from "./schema";

export function addRating(professor: Professor, reviewUnparsed: Rating, courseName: string) {
    // Ensure that no extraneous keys are present
    // Unsure if this is actually needed since the kv put may strip anyways
    const review = ratingParser.parse(reviewUnparsed);

    // Ensure that the review has the correct professor id
    review.professor = professor.id;

    // For migration purposes from old schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    professor.tags ??= {} as any;

    // Add tags to the professor
    for (const tag of review.tags ?? []) {
        const current = professor.tags![tag] ?? 0;
        professor.tags![tag] = current + 1;
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

    // Decrement tag counts to match addRating (single and bulk delete must stay consistent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    professor.tags ??= {} as any;
    for (const tag of removedRating.tags ?? []) {
        const current = professor.tags![tag] ?? 0;
        professor.tags![tag] = Math.max(0, current - 1);
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

/**
 * Removes multiple ratings from a professor in a single pass (O(reviews) instead of O(ids * reviews)).
 * Mutates professor in place. Idempotent: IDs not found are treated as already deleted (no-op).
 * Throws only when none of the requested IDs exist (nothing to do).
 */
export function removeRatingsBulk(professor: Professor, ratingIds: string[]): number {
    if (ratingIds.length === 0) return 0;

    const idsToRemove = new Set(ratingIds);
    const removedRatings: Rating[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    professor.tags ??= {} as any;

    for (const courseName of Object.keys(professor.reviews)) {
        const ratings = professor.reviews[courseName];
        const kept: Rating[] = [];
        for (const rating of ratings) {
            if (idsToRemove.has(rating.id)) {
                removedRatings.push(rating);
            } else {
                kept.push(rating);
            }
        }
        if (kept.length === 0) {
            delete professor.reviews[courseName];
        } else {
            professor.reviews[courseName] = kept;
        }
    }

    professor.courses = Object.keys(professor.reviews);

    if (removedRatings.length === 0) {
        throw new Error(
            `None of the ${ratingIds.length} rating ID(s) were found on this professor. They may already have been deleted.`,
        );
    }

    for (const rating of removedRatings) {
        for (const tag of rating.tags ?? []) {
            const current = professor.tags![tag] ?? 0;
            professor.tags![tag] = Math.max(0, current - 1);
        }
    }

    const oldNumEvals = professor.numEvals;
    const newNumEvals = oldNumEvals - removedRatings.length;
    if (newNumEvals <= 0) {
        professor.numEvals = 0;
        professor.materialClear = 0;
        professor.studentDifficulties = 0;
        professor.overallRating = 0;
        return removedRatings.length;
    }

    const sumMaterial = removedRatings.reduce((s, r) => s + r.presentsMaterialClearly, 0);
    const sumStudentDiff = removedRatings.reduce((s, r) => s + r.recognizesStudentDifficulties, 0);
    const sumOverall = removedRatings.reduce((s, r) => s + r.overallRating, 0);

    professor.numEvals = newNumEvals;
    professor.materialClear = roundToPrecision(
        (professor.materialClear * oldNumEvals - sumMaterial) / newNumEvals,
        2,
    );
    professor.studentDifficulties = roundToPrecision(
        (professor.studentDifficulties * oldNumEvals - sumStudentDiff) / newNumEvals,
        2,
    );
    professor.overallRating = roundToPrecision(
        (professor.overallRating * oldNumEvals - sumOverall) / newNumEvals,
        2,
    );
    return removedRatings.length;
}

export function professorToTruncatedProfessor({
    id,
    firstName,
    lastName,
    department,
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
        department,
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
