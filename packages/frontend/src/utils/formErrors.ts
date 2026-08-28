export const formErrors = {
    firstName: "Enter a first name",
    lastName: "Enter a last name",
    username: "Enter a username",
    password: "Enter a password",
    department: "Select a department",
    coursePrefix: "Select a course prefix",
    courseNum: "Enter a course number from 100 to 599",
    course: "Select a course",
    rating: "Select a rating",
    year: "Select a year",
    grade: "Select a grade",
    courseType: "Select a reason for taking this course",
    ratingText: "Write at least 20 characters",
    email: "Enter a valid email address",
    reportReason: "Explain why this rating should be reviewed",
    reviewLicense: "Confirm this review is yours and that Polyratings may publish it",
} as const;

export function formError(message: string) {
    return { error: message };
}
