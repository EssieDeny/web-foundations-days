
-- Day 6: School database assignment

-- Remove existing tables so the script can be run again
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

PRAGMA foreign_keys = ON;

-- Create students table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Create courses table
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL UNIQUE
);

-- Create enrolments table
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    UNIQUE (student_id, course_id)
);

-- Insert students
INSERT INTO students (student_id, name, email) VALUES
(1, 'Grace Muriithi', 'grace@example.com'),
(2, 'Mary Wanjiku', 'mary@example.com'),
(3, 'John Kamau', 'john@example.com'),
(4, 'Peter Otieno', 'peter@example.com');

-- Insert courses
INSERT INTO courses (course_id, course_name, course_code) VALUES
(1, 'Database Fundamentals', 'DB101'),
(2, 'Web Development', 'WEB101'),
(3, 'Computer Networks', 'NET101');

-- Insert five enrolments
INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
(1, 1, 1, 'A'),
(2, 1, 2, 'B'),
(3, 2, 1, 'B'),
(4, 3, 2, 'A'),
(5, 3, 3, 'C');

-- QUERY 1: Courses taken by one student
SELECT
    s.name AS student_name,
    c.course_name,
    e.grade
FROM students AS s
JOIN enrolments AS e ON s.student_id = e.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.name = 'Grace Muriithi';

-- QUERY 2: Students taking one course
SELECT
    c.course_name,
    s.name AS student_name,
    e.grade
FROM courses AS c
JOIN enrolments AS e ON c.course_id = e.course_id
JOIN students AS s ON e.student_id = s.student_id
WHERE c.course_name = 'Database Fundamentals';

-- QUERY 3: Number of students per course
SELECT
    c.course_name,
    COUNT(e.student_id) AS number_of_students
FROM courses AS c
LEFT JOIN enrolments AS e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_name;

-- QUERY 4: Students with no enrolments
SELECT
    s.student_id,
    s.name,
    s.email
FROM students AS s
LEFT JOIN enrolments AS e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- QUERY 5: Update an enrolment grade
UPDATE enrolments
SET grade = 'A'
WHERE enrolment_id = 2;

-- Verify the updated grade
SELECT *
FROM enrolments
WHERE enrolment_id = 2;

-- Add an index to help course enrolment searches
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
