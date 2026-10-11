# School Database Design

## Tables

### Students

The students table stores each student's ID, name, and email address.
The student ID is the primary key, and the email address must be unique
so that two students cannot register with the same email.

### Courses

The courses table stores each course's ID, name, and course code.
The course ID is the primary key, and each course code must be unique.

### Enrolments

The enrolments table records which student is taking which course and
the student's grade. It has its own primary key and foreign keys
referencing students and courses. The combination of student_id and
course_id is unique to prevent duplicate enrolments.

## Relationships

Students and enrolments have a one-to-many relationship because one
student can enrol in several courses, while each enrolment belongs to
one student.

Courses and enrolments also have a one-to-many relationship because
one course can have several students, while each enrolment refers to
one course.

Students and courses therefore have a many-to-many relationship:
a student can take several courses, and a course can have several
students. The enrolments table acts as a join table connecting
students and courses. It avoids storing lists of IDs in a single
column and stores information specific to each enrolment, such as
the grade.

## Index

I added an index on enrolments(course_id) to speed up queries that
find students enrolled in a particular course and queries that count
enrolments per course. This is useful when the database contains
many enrolments. The index requires additional storage and can add
some overhead when enrolments are inserted, updated, or deleted.

## SQL or NoSQL?

I would choose a relational SQL database for this school system.
Students, courses, and enrolments have clearly defined relationships.
Primary keys, foreign keys, and unique constraints help maintain
data integrity. SQL joins also make it straightforward to retrieve
courses for a student and students for a course. A NoSQL database
could work, but a relational database is a natural fit for this
structured data and its many-to-many relationship.
