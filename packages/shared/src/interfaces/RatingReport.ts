export interface RatingReport {
    reports: Report[];
    professorId: string;
    ratingId: string;
}

export interface Report {
    email: string;
    reason: string;
}
