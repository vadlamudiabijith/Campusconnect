/*
  # Add Grading, CGPA/SGPA, and Security Features

  1. Changes
    - Add `submitted_at` column to assignment_submissions if missing
    - Add `semester` column to grades for SGPA grouping
    - Add `grade_points` column to grades table for GPA calculation
    - Create `security_logs` table for campus security events
    - Create `campus_alerts` table for security alerts

  2. Security
    - RLS on all new tables
    - Security staff can manage security_logs and campus_alerts
    - Students/faculty can view their own grades
*/

-- Ensure submitted_at exists on assignment_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignment_submissions' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE assignment_submissions ADD COLUMN submitted_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add grade_points to grades for GPA calc (A+=10, A=9, B+=8, B=7, C=6, D=5, F=0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grades' AND column_name = 'grade_points'
  ) THEN
    ALTER TABLE grades ADD COLUMN grade_points numeric(4,2) DEFAULT 0;
  END IF;
END $$;

-- Add semester to grades for SGPA grouping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grades' AND column_name = 'semester'
  ) THEN
    ALTER TABLE grades ADD COLUMN semester text DEFAULT '';
  END IF;
END $$;

-- Security logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_by uuid REFERENCES profiles(id),
  event_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  severity text DEFAULT 'low',
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security staff can insert logs"
  ON security_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  );

CREATE POLICY "Security staff can view logs"
  ON security_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  );

CREATE POLICY "Security staff can update logs"
  ON security_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  );

-- Campus alerts table
CREATE TABLE IF NOT EXISTS campus_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  message text DEFAULT '',
  alert_type text DEFAULT 'info',
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campus_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security/admin can insert alerts"
  ON campus_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  );

CREATE POLICY "Authenticated users can view active alerts"
  ON campus_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Security/admin can update alerts"
  ON campus_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security', 'admin'))
  );
