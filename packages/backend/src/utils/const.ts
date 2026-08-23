import { PendingRating, Professor, RatingReport, User } from "@backend/types/schema";

/**
 * Department codes for professor home department and the department half of a
 * course key (`CSC 101`). Historical 2022 codes are kept; 2026–28 SLO catalog
 * departments/prefixes that were missing are added.
 */
export const DEPARTMENT_LIST = [
    "AEPS",
    "AERO",
    "AG",
    "AGB",
    "AGC",
    "AGED",
    "ANT",
    "AP",
    "ARCE",
    "ARCH",
    "ART",
    "ASCI",
    "ASTR",
    "ATHL",
    "BIO",
    "BMED",
    "BOT",
    "BRAE",
    "BUS",
    "CD",
    "CE",
    "CHEM",
    "CHIN",
    "CI",
    "CLA",
    "CM",
    "CMAT",
    "COMS",
    "CPE",
    "CRP",
    "CSC",
    "CSUC",
    "CSUV",
    "DANC",
    "DATA",
    "DE",
    "DEV10",
    "DEV11",
    "DSCI",
    "ECON",
    "EDES",
    "EDUC",
    "EE",
    "EIM",
    "ELAP",
    "ENGL",
    "ENGR",
    "ENVE",
    "ERSC",
    "ES",
    "ESCI",
    "ESM",
    "EXSS",
    "FDSC",
    "FPE",
    "FR",
    "FSN",
    "GEOG",
    "GEOL",
    "GER",
    "GRC",
    "GS",
    "GSA",
    "GSB",
    "GSE",
    "GSP",
    "HCSA",
    "HIST",
    "HLTH",
    "HNRC",
    "HNRS",
    "IME",
    "IP",
    "IS",
    "ISLA",
    "ITAL",
    "ITP",
    "JOUR",
    "JPNS",
    "KINE",
    "LA",
    "LAES",
    "LS",
    "MATE",
    "MATH",
    "MCRO",
    "ME",
    "MSCI",
    "MSL",
    "MU",
    "NE",
    "NR",
    "NUTR",
    "PEM",
    "PEW",
    "PHIL",
    "PHYS",
    "PLSC",
    "POLS",
    "PSC",
    "PSY",
    "RELS",
    "RPTA",
    "SCM",
    "SOC",
    "SPAN",
    "SPED",
    "SS",
    "STAT",
    "TH",
    "UNIV",
    "WGS",
    "WGQS",
    "WLC",
    "WVIT",
] as const;
export type Department = (typeof DEPARTMENT_LIST)[number];
export const COURSE_TYPES = [
    "Elective",
    "General Ed",
    "Major (Support)",
    "Major (Required)",
] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const GRADE_LEVELS = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "5th/6th Year",
    "Grad Student",
] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADES = ["N/A", "A", "B", "C", "D", "F", "CR", "NC", "W"] as const;
export type Grade = (typeof GRADES)[number];

export const PENDING_RATING_STATUSES = ["Successful", "Failed"] as const;
export type PendingRatingStatus = (typeof PENDING_RATING_STATUSES)[number];

export const bulkKeys = [
    "professor-queue",
    "professors",
    "rating-log",
    "reports",
    "users",
] as const;

export type BulkKey = (typeof bulkKeys)[number];

export type BulkKeyMap = {
    professors: Professor[];
    "rating-log": PendingRating[];
    "professor-queue": Professor[];
    reports: RatingReport[];
    users: User[];
};

export const MAX_PROFESSOR_TAGS_PER_RATING = 3;

export const PROFESSOR_TAGS = [
    "Hybrid Option",
    "Recorded Lectures",
    "Zoom Office Hours",
    "High In-Person Availability",
    "Fast Response Time",
    "Flexible Attendance Policy",
    "Inflexible Attendance Policy",
    "Flexible Deadline Policy",
    "Class Handouts",
    "Inflexible Deadline Policy",
    "Pop Quizzes",
    "Supplemental Study Material",
    "Flexible Grading Policy",
    "Inflexible Grading Policy",
    "Does Not Use Canvas",
    "Honor DRC Accommodations",
    "Uploads Slides",
    "No Breaks During Lecture",
] as const;

export const ALL_PROFESSOR_KEY = "all";

type KeysAlign<A extends PropertyKey, B extends PropertyKey> = [
    Exclude<A, B> | Exclude<B, A>,
] extends [never]
    ? true
    : false;

/**
 * Compile-time assert: if `bulkKeys` and `BulkKeyMap` keys diverge, the assignment fails typecheck.
 * The binding is never read at runtime; only its type is checked.
 */
type __Assert<T extends true> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- compile-time only (see JSDoc above)
const bulkKeysKvSchemaSanity: __Assert<KeysAlign<BulkKey, keyof BulkKeyMap>> = true;
