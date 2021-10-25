CREATE DATABASE polyratings_db_revamp_v1;

CREATE TABLE TEACHER(
    teacher_id SERIAL PRIMARY KEY,

    teacher_name VARCHAR(255),
    overall_rating DECIMAL(3,2),
    recognizes_student_difficulties DECIMAL(3,2),
    presents_material_clearly DECIMAL(3,2),
    number_of_evaluations DECIMAL(3,2)
);

CREATE TABLE CLASS(
    FOREIGN KEY (teacher_id) REFERENCES TEACHER(teacher_id),

    class_name VARCHAR(255)
);

CREATE TABLE REVIEW(
    FOREIGN KEY (class_id) REFERENCES TEACHER(class_id),

    year_taken VARCHAR(255),
    grade_acheived VARCHAR(255),
    reason_for_taking VARCHAR(255),
    date_added DATETIME NOT NULL DEFAULT(NOW()),
    review_text TEXT
);