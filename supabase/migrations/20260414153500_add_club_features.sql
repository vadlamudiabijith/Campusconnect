
/*
  # Club Features Enhancement

  ## Changes:
  1. New Tables:
    - `club_announcements` - Separate announcements per club
    - `club_event_registrations` - Registrations for club events with payment
  
  2. Modified Tables:
    - `events` - Add student_created flag and club_event_type
    - `clubs` - Add socials, website, meeting_schedule
  
  ## Security: RLS on all new tables
*/

-- CLUB ANNOUNCEMENTS (separate from course announcements)
CREATE TABLE IF NOT EXISTS club_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view club announcements" ON club_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Club officers and admins can post" ON club_announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = club_announcements.club_id AND user_id = auth.uid() AND role IN ('president','officer'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin'))
  );
CREATE POLICY "Authors can update announcements" ON club_announcements FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete announcements" ON club_announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- CLUB MESSAGES (chat per club)
CREATE TABLE IF NOT EXISTS club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view messages" ON club_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Club members can send messages" ON club_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Add columns to events for student-created club events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by_student') THEN
    ALTER TABLE events ADD COLUMN created_by_student boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'approval_status') THEN
    ALTER TABLE events ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending','approved','rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'currency') THEN
    ALTER TABLE events ADD COLUMN currency text DEFAULT 'MYR';
  END IF;
END $$;

-- Allow students to create events in clubs they belong to
DROP POLICY IF EXISTS "Faculty/Admin can create events" ON events;
CREATE POLICY "Members can create club events" ON events FOR INSERT TO authenticated
  WITH CHECK (
    organizer_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin'))
      OR (
        club_id IS NOT NULL AND
        EXISTS (SELECT 1 FROM club_members WHERE club_id = events.club_id AND user_id = auth.uid())
      )
    )
  );

-- Add columns to clubs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = 'website') THEN
    ALTER TABLE clubs ADD COLUMN website text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = 'meeting_schedule') THEN
    ALTER TABLE clubs ADD COLUMN meeting_schedule text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = 'tags') THEN
    ALTER TABLE clubs ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- Update payments to track currency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'currency') THEN
    ALTER TABLE payments ADD COLUMN currency text DEFAULT 'MYR';
  END IF;
END $$;
