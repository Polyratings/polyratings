import type { IsEqual } from "type-fest";
// eslint-disable-next-line import/no-cycle
import { PendingRating, Professor, RatingReport, User } from "@backend/types/schema";

/**
 * List of all departments with courses as of 1/23/2022
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
    "BIO",
    "BMED",
    "BOT",
    "BRAE",
    "BUS",
    "CD",
    "CE",
    "CHEM",
    "CHIN",
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
    "ENGL",
    "ENGR",
    "ENVE",
    "ERSC",
    "ES",
    "ESCI",
    "EXSS",
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
    "HIST",
    "HLTH",
    "HNRC",
    "HNRS",
    "IME",
    "IP",
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
    "PEM",
    "PEW",
    "PHIL",
    "PHYS",
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

// TODO: Add type assert of BulkKey == keyof BulkKeyMap
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

type TypeEqual = IsEqual<BulkKey, keyof BulkKeyMap> extends true ? true : never;
// Error will be generated here if the BulkKey union does not match the keys of BulkKeyMap
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const realPart: TypeEqual = true;
