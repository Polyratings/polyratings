import { Review } from "./Review";

export interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    overallRating: number;
    studentDifficulties: number;
    materialClear: number;
    numEvals: number;
    courses: string[];
    reviews?: Record<string, Review[]>;
}
