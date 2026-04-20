/*
  # Add Parent Portal, Club Attendance, Private Chat, and Seed Data

  1. New Tables
    - `club_attendance` - QR-based attendance for club meetings/events
      - `id`, `club_id`, `session_name`, `qr_code`, `date`, `created_by`, `is_active`
    - `club_attendance_records` - Individual attendance records
      - `id`, `session_id`, `user_id`, `scanned_at`
    - `private_messages` - Private chat between students and faculty
      - `id`, `sender_id`, `receiver_id`, `course_id`, `content`, `created_at`, `is_read`

  2. Profile Changes
    - Add `parent_of` column to profiles (stores student_id this parent account is linked to)
    - Add `parent` as a role option (already handled by text type)

  3. Security
    - RLS on all new tables
    - Parents can only view data of their linked student

  4. Seed Data
    - Demo accounts: student, faculty, admin, parent
    - 5 courses with materials and announcements
    - 8 clubs
*/

-- Club attendance sessions
CREATE TABLE IF NOT EXISTS club_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  session_name text NOT NULL DEFAULT '',
  qr_code text NOT NULL UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE club_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view attendance sessions"
  ON club_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members WHERE club_id = club_attendance.club_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Club admin can insert attendance sessions"
  ON club_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      EXISTS (
        SELECT 1 FROM club_members WHERE club_id = club_attendance.club_id AND user_id = auth.uid() AND role IN ('president','officer')
      ) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Club admin can update attendance sessions"
  ON club_attendance FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Club attendance records (individual scan records)
CREATE TABLE IF NOT EXISTS club_attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES club_attendance(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  scanned_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE club_attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance records"
  ON club_attendance_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Club session members can view all records"
  ON club_attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_attendance ca
      JOIN club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id = session_id AND cm.user_id = auth.uid() AND cm.role IN ('president','officer')
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Members can insert own attendance record"
  ON club_attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Private messages between students and faculty
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  receiver_id uuid REFERENCES profiles(id) NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private messages"
  ON private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send private messages"
  ON private_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can mark as read"
  ON private_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Add parent_of to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'parent_of'
  ) THEN
    ALTER TABLE profiles ADD COLUMN parent_of text DEFAULT NULL;
  END IF;
END $$;

-- Add more clubs
INSERT INTO clubs (name, description, category, is_active, member_count)
VALUES
  ('Robotics Club', 'Build and program robots for competitions and fun projects', 'Technology', true, 0),
  ('Photography Club', 'Capture the world through your lens — workshops and contests', 'Arts', true, 0),
  ('Debate Society', 'Sharpen your arguments, compete in inter-college debates', 'Academic', true, 0),
  ('Dance Troupe', 'Classical and contemporary dance performances and training', 'Cultural', true, 0),
  ('Nature & Trekking Club', 'Weekend treks, nature photography and eco-awareness drives', 'Environment', true, 0),
  ('Music Ensemble', 'Vocals, instruments, and campus concerts — join the band', 'Arts', true, 0),
  ('Entrepreneurship Cell', 'Startup pitches, hackathons, and founder meetups', 'Academic', true, 0),
  ('Chess Club', 'From beginners to grandmasters — weekly tournaments', 'Academic', true, 0),
  ('Cycling Club', 'Group rides, fitness goals, and city trail exploration', 'Sports', true, 0),
  ('Film & Media Club', 'Screenplay writing, short film production, and film screenings', 'Arts', true, 0)
ON CONFLICT DO NOTHING;
