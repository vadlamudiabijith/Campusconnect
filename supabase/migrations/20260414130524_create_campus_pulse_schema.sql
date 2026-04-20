
/*
  # CampusPulse - Full Schema Migration

  ## Overview
  Creates all tables for the CampusPulse smart campus platform.

  ## Tables Created:
  1. profiles - Extended user data (roles, student/faculty IDs)
  2. courses - Academic courses
  3. course_enrollments - Student-course relationships
  4. announcements - Course announcements by faculty
  5. assignments - Course assignments
  6. assignment_submissions - Student assignment completions
  7. materials - Course study materials
  8. messages - Course chat messages
  9. grades - Student grades per course
  10. attendance - Daily attendance records
  11. issues - Campus issue reports
  12. clubs - Student clubs
  13. club_members - Club membership
  14. events - Campus/club events
  15. event_registrations - Event sign-ups
  16. payments - Payment records
  17. visitors - Visitor management
  18. timetable - Weekly class schedule
  19. feedback - System/course feedback
  20. notifications - User notifications

  ## Security: RLS enabled on all tables
*/

-- PROFILES (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','faculty','admin','visitor','security')),
  student_id text DEFAULT NULL,
  faculty_id text DEFAULT NULL,
  avatar_url text DEFAULT NULL,
  department text DEFAULT '',
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  faculty_id uuid REFERENCES profiles(id),
  credits integer DEFAULT 3,
  semester text DEFAULT '',
  color text DEFAULT '#3B82F6',
  cover_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view courses" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty/Admin can insert courses" ON courses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin'))
);
CREATE POLICY "Faculty/Admin can update courses" ON courses FOR UPDATE TO authenticated
  USING (faculty_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (faculty_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- COURSE ENROLLMENTS
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id)
);
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own enrollments" ON course_enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Admin/Faculty can manage enrollments" ON course_enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Students can delete own enrollments" ON course_enrollments FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users can view announcements" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty can create announcements" ON announcements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Authors can update announcements" ON announcements FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete announcements" ON announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text DEFAULT '',
  due_date timestamptz,
  max_marks integer DEFAULT 100,
  type text DEFAULT 'assignment' CHECK (type IN ('assignment','quiz','project','exam')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assignments" ON assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty can create assignments" ON assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty can update assignments" ON assignments FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Faculty can delete assignments" ON assignments FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ASSIGNMENT SUBMISSIONS
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending','submitted','graded')),
  marks integer DEFAULT NULL,
  notes text DEFAULT '',
  submitted_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own, faculty view all submissions" ON assignment_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Students can submit" ON assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students and faculty can update submissions" ON assignment_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')))
  WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- MATERIALS
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text DEFAULT '',
  file_url text DEFAULT '',
  file_type text DEFAULT 'pdf',
  module text DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view materials" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty can upload materials" ON materials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Uploaders can delete materials" ON materials FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- MESSAGES (Course Chat)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Course members can view messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send messages" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- GRADES
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  marks integer NOT NULL DEFAULT 0,
  max_marks integer NOT NULL DEFAULT 100,
  feedback text DEFAULT '',
  graded_by uuid REFERENCES profiles(id),
  graded_at timestamptz DEFAULT now(),
  UNIQUE(student_id, assignment_id)
);
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own grades, faculty view all" ON grades FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty can insert grades" ON grades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty can update grades" ON grades FOR UPDATE TO authenticated
  USING (graded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')))
  WITH CHECK (graded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  marked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id, date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own, faculty view all attendance" ON attendance FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty can mark attendance" ON attendance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty can update attendance" ON attendance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- ISSUES
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  location text DEFAULT '',
  image_url text DEFAULT '',
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view issues" ON issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can report issues" ON issues FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporters and admins can update issues" ON issues FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ISSUE TIMELINE
CREATE TABLE IF NOT EXISTS issue_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE issue_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view timeline" ON issue_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add timeline events" ON issue_timeline FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- CLUBS
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  logo_url text DEFAULT '',
  banner_url text DEFAULT '',
  president_id uuid REFERENCES profiles(id),
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clubs" ON clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can create clubs" ON clubs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','faculty')));
CREATE POLICY "Admin can update clubs" ON clubs FOR UPDATE TO authenticated
  USING (president_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (president_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- CLUB MEMBERS
CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member','officer','president')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view club members" ON club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join clubs" ON club_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can leave clubs" ON club_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL,
  organizer_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  location text DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_paid boolean DEFAULT false,
  fee numeric(10,2) DEFAULT 0,
  max_capacity integer DEFAULT NULL,
  registered_count integer DEFAULT 0,
  banner_url text DEFAULT '',
  tags text[] DEFAULT '{}',
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty/Admin can create events" ON events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Organizers can update events" ON events FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- EVENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own, admin view all registrations" ON event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Users can register for events" ON event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can cancel registration" ON event_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own registration" ON event_registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  reference_id uuid DEFAULT NULL,
  reference_type text DEFAULT 'event' CHECK (reference_type IN ('event','fee','other')),
  amount numeric(10,2) NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  transaction_id text DEFAULT NULL,
  payment_method text DEFAULT 'card',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments, admin views all" ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "System can create payments" ON payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can update payments" ON payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- VISITORS
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  purpose text NOT NULL,
  host_id uuid REFERENCES profiles(id),
  host_name text DEFAULT '',
  qr_code text DEFAULT '',
  check_in timestamptz DEFAULT NULL,
  check_out timestamptz DEFAULT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','checked_in','checked_out','expired')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts and admins can view visitors" ON visitors FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','security')));
CREATE POLICY "Authenticated can register visitors" ON visitors FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','security')));
CREATE POLICY "Hosts and security can update visitors" ON visitors FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','security')))
  WITH CHECK (host_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','security')));

-- TIMETABLE
CREATE TABLE IF NOT EXISTS timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text DEFAULT '',
  week_topic text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view timetable" ON timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty/Admin can manage timetable" ON timetable FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty/Admin can update timetable" ON timetable FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));
CREATE POLICY "Faculty/Admin can delete timetable" ON timetable FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

-- FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  target_type text DEFAULT 'course' CHECK (target_type IN ('course','faculty','campus','event')),
  target_id uuid DEFAULT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all, users view own feedback" ON feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated can submit feedback" ON feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info','success','warning','error','assignment','event','message','issue')),
  is_read boolean DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- SEED DEMO DATA FOR CLUBS
INSERT INTO clubs (name, description, category, logo_url, member_count) VALUES
  ('Tech Innovators', 'Building the future with technology', 'Technology', '', 42),
  ('Photography Club', 'Capturing moments that matter', 'Arts', '', 28),
  ('Debate Society', 'Sharpening minds through discourse', 'Academic', '', 35),
  ('Sports Federation', 'Uniting athletes across campus', 'Sports', '', 120),
  ('Environmental Warriors', 'Making our campus green and sustainable', 'Environment', '', 56)
ON CONFLICT DO NOTHING;
