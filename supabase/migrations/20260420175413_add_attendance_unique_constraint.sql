/*
  # Add unique constraint to attendance table

  Allows upsert on (course_id, student_id, date) so faculty can backdate
  or update attendance without creating duplicates.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'attendance' AND constraint_name = 'attendance_course_student_date_unique'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_course_student_date_unique
      UNIQUE (course_id, student_id, date);
  END IF;
END $$;

-- Also add unique constraint for grades (course_id, student_id, assignment_id) for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'grades' AND constraint_name = 'grades_course_student_assignment_unique'
  ) THEN
    ALTER TABLE grades ADD CONSTRAINT grades_course_student_assignment_unique
      UNIQUE (course_id, student_id, assignment_id);
  END IF;
END $$;
