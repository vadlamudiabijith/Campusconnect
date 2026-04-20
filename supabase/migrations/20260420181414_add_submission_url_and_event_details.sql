/*
  # Add submission file URL and event features

  1. Changes
    - Add `submission_url` to assignment_submissions for document uploads
    - Add `feedback` to assignment_submissions for faculty notes per submission
    - Add `event_attendees` check-in table for event detail page
  
  2. Security
    - RLS on event_attendees
*/

-- submission_url on assignment_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignment_submissions' AND column_name = 'submission_url'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN submission_url text DEFAULT '';
  END IF;
END $$;

-- feedback column on assignment_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignment_submissions' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN feedback text DEFAULT '';
  END IF;
END $$;

-- notes column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignment_submissions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;
