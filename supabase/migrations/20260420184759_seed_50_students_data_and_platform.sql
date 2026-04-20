
-- =============================================================
-- SEED: 50 Students + Full Platform Data
-- =============================================================

-- -----------------------------------------------------------------
-- STEP 1: Insert 50 users into auth.users
-- -----------------------------------------------------------------
DO $$
DECLARE
  i INT;
  uid UUID;
BEGIN
  FOR i IN 1..50 LOOP
    uid := ('bb0000' || LPAD(i::text, 2, '0') || '-0000-0000-0000-' || LPAD(i::text, 12, '0'))::uuid;
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role
    ) VALUES (
      uid,
      'student' || LPAD(i::text, 2, '0') || '@university.edu',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'Student ' || LPAD(i::text, 2, '0')),
      false,
      'authenticated'
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- -----------------------------------------------------------------
-- STEP 2: Insert matching rows into profiles
-- -----------------------------------------------------------------
DO $$
DECLARE
  i INT;
  uid UUID;
  depts TEXT[] := ARRAY['Computer Science','Information Technology','Electrical Engineering','Mechanical Engineering','Civil Engineering'];
BEGIN
  FOR i IN 1..50 LOOP
    uid := ('bb0000' || LPAD(i::text, 2, '0') || '-0000-0000-0000-' || LPAD(i::text, 12, '0'))::uuid;
    INSERT INTO profiles (id, name, email, role, student_id, department, bio, created_at, updated_at)
    VALUES (
      uid,
      'Student ' || LPAD(i::text, 2, '0'),
      'student' || LPAD(i::text, 2, '0') || '@university.edu',
      'student',
      'STU' || LPAD(i::text, 5, '0'),
      depts[((i - 1) % 5) + 1],
      'Seed student #' || i,
      now(),
      now()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- -----------------------------------------------------------------
-- STEP 3: Enroll the 50 bb0000* students in courses cccccccc-0001..0005
-- -----------------------------------------------------------------
INSERT INTO course_enrollments (course_id, student_id)
SELECT
  c.id AS course_id,
  s.id AS student_id
FROM profiles s
CROSS JOIN courses c
WHERE s.id::text LIKE 'bb0000%'
  AND c.id::text LIKE 'cccccccc%'
ON CONFLICT (course_id, student_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 4: Also enroll existing non-bb students in those same 5 courses
-- -----------------------------------------------------------------
INSERT INTO course_enrollments (course_id, student_id)
SELECT
  c.id AS course_id,
  s.id AS student_id
FROM profiles s
CROSS JOIN courses c
WHERE s.role = 'student'
  AND s.id::text NOT LIKE 'bb0000%'
  AND c.id::text LIKE 'cccccccc%'
ON CONFLICT (course_id, student_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 5: Insert 18 assignments (aa000001..aa000018) across 5 courses
-- -----------------------------------------------------------------
INSERT INTO assignments (id, course_id, created_by, title, description, due_date, max_marks, type)
VALUES
  -- Course 1: cccccccc-0001 (4 assignments)
  ('aa000001-0000-0000-0000-000000000001'::uuid, 'cccccccc-0001-0001-0001-000000000001'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DSA Assignment 1', 'Arrays and Linked Lists', now() + interval '7 days', 100, 'assignment'),
  ('aa000002-0000-0000-0000-000000000002'::uuid, 'cccccccc-0001-0001-0001-000000000001'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DSA Quiz 1', 'Sorting Algorithms Quiz', now() + interval '14 days', 50, 'quiz'),
  ('aa000003-0000-0000-0000-000000000003'::uuid, 'cccccccc-0001-0001-0001-000000000001'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DSA Assignment 2', 'Trees and Graphs', now() + interval '21 days', 100, 'assignment'),
  ('aa000004-0000-0000-0000-000000000004'::uuid, 'cccccccc-0001-0001-0001-000000000001'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DSA Project', 'Algorithm Implementation Project', now() + interval '30 days', 200, 'project'),
  -- Course 2: cccccccc-0002 (4 assignments)
  ('aa000005-0000-0000-0000-000000000005'::uuid, 'cccccccc-0002-0002-0002-000000000002'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DBMS Assignment 1', 'ER Diagrams and Normalization', now() + interval '7 days', 100, 'assignment'),
  ('aa000006-0000-0000-0000-000000000006'::uuid, 'cccccccc-0002-0002-0002-000000000002'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DBMS Quiz 1', 'SQL Fundamentals', now() + interval '14 days', 50, 'quiz'),
  ('aa000007-0000-0000-0000-000000000007'::uuid, 'cccccccc-0002-0002-0002-000000000002'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DBMS Assignment 2', 'Transactions and Concurrency', now() + interval '21 days', 100, 'assignment'),
  ('aa000008-0000-0000-0000-000000000008'::uuid, 'cccccccc-0002-0002-0002-000000000002'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'DBMS Project', 'Database Design Project', now() + interval '30 days', 200, 'project'),
  -- Course 3: cccccccc-0003 (3 assignments)
  ('aa000009-0000-0000-0000-000000000009'::uuid, 'cccccccc-0003-0003-0003-000000000003'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'OS Assignment 1', 'Process Management', now() + interval '7 days', 100, 'assignment'),
  ('aa000010-0000-0000-0000-000000000010'::uuid, 'cccccccc-0003-0003-0003-000000000003'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'OS Quiz 1', 'Memory Management Quiz', now() + interval '14 days', 50, 'quiz'),
  ('aa000011-0000-0000-0000-000000000011'::uuid, 'cccccccc-0003-0003-0003-000000000003'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'OS Assignment 2', 'File Systems', now() + interval '21 days', 100, 'assignment'),
  -- Course 4: cccccccc-0004 (4 assignments)
  ('aa000012-0000-0000-0000-000000000012'::uuid, 'cccccccc-0004-0004-0004-000000000004'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'CN Assignment 1', 'OSI Model and Protocols', now() + interval '7 days', 100, 'assignment'),
  ('aa000013-0000-0000-0000-000000000013'::uuid, 'cccccccc-0004-0004-0004-000000000004'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'CN Quiz 1', 'TCP/IP Quiz', now() + interval '14 days', 50, 'quiz'),
  ('aa000014-0000-0000-0000-000000000014'::uuid, 'cccccccc-0004-0004-0004-000000000004'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'CN Assignment 2', 'Routing Algorithms', now() + interval '21 days', 100, 'assignment'),
  ('aa000015-0000-0000-0000-000000000015'::uuid, 'cccccccc-0004-0004-0004-000000000004'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'CN Project', 'Network Simulation Project', now() + interval '30 days', 200, 'project'),
  -- Course 5: cccccccc-0005 (3 assignments)
  ('aa000016-0000-0000-0000-000000000016'::uuid, 'cccccccc-0005-0005-0005-000000000005'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'ML Assignment 1', 'Regression Models', now() + interval '7 days', 100, 'assignment'),
  ('aa000017-0000-0000-0000-000000000017'::uuid, 'cccccccc-0005-0005-0005-000000000005'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'ML Quiz 1', 'Classification Algorithms', now() + interval '14 days', 50, 'quiz'),
  ('aa000018-0000-0000-0000-000000000018'::uuid, 'cccccccc-0005-0005-0005-000000000005'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid, 'ML Project', 'Neural Network Project', now() + interval '30 days', 200, 'project')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 6: Insert grades for all 50 bb0000* students across 18 assignments
-- Grade distribution by rank (ROW_NUMBER() ordered by student id):
--   rank 1-5:   grade_points=10
--   rank 6-10:  grade_points=9
--   rank 11-18: grade_points=8
--   rank 19-28: grade_points=7
--   rank 29-38: grade_points=6
--   rank 39-46: grade_points=5
--   rank 47-50: grade_points=0
-- -----------------------------------------------------------------
INSERT INTO grades (course_id, student_id, assignment_id, marks, max_marks, grade_points, graded_by, feedback, semester)
SELECT
  a.course_id,
  s.id AS student_id,
  a.id AS assignment_id,
  CASE
    WHEN rk <= 5  THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.95))
    WHEN rk <= 10 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.88))
    WHEN rk <= 18 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.80))
    WHEN rk <= 28 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.72))
    WHEN rk <= 38 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.65))
    WHEN rk <= 46 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.55))
    ELSE 0
  END AS marks,
  a.max_marks,
  CASE
    WHEN rk <= 5  THEN 10
    WHEN rk <= 10 THEN 9
    WHEN rk <= 18 THEN 8
    WHEN rk <= 28 THEN 7
    WHEN rk <= 38 THEN 6
    WHEN rk <= 46 THEN 5
    ELSE 0
  END AS grade_points,
  'aaaaaaaa-0002-0002-0002-000000000002'::uuid AS graded_by,
  CASE
    WHEN rk <= 5  THEN 'Excellent work!'
    WHEN rk <= 10 THEN 'Very good performance.'
    WHEN rk <= 18 THEN 'Good effort.'
    WHEN rk <= 28 THEN 'Satisfactory.'
    WHEN rk <= 38 THEN 'Needs improvement.'
    WHEN rk <= 46 THEN 'Below average.'
    ELSE 'Did not submit.'
  END AS feedback,
  'Semester 1' AS semester
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rk
  FROM profiles
  WHERE id::text LIKE 'bb0000%'
) s
CROSS JOIN (
  SELECT id, course_id, max_marks
  FROM assignments
  WHERE id::text LIKE 'aa0000%'
) a
ON CONFLICT (student_id, assignment_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 7: Insert attendance for all 50 students across 5 courses
-- Date series: CURRENT_DATE-60 to CURRENT_DATE-1, every 3 days
-- Every 8th record = absent, every 12th = late, else present
-- -----------------------------------------------------------------
INSERT INTO attendance (course_id, student_id, date, status, marked_by)
SELECT
  c.id AS course_id,
  s.id AS student_id,
  d.dt AS date,
  CASE
    WHEN ROW_NUMBER() OVER (PARTITION BY s.id, c.id ORDER BY d.dt) % 8 = 0  THEN 'absent'
    WHEN ROW_NUMBER() OVER (PARTITION BY s.id, c.id ORDER BY d.dt) % 12 = 0 THEN 'late'
    ELSE 'present'
  END AS status,
  'aaaaaaaa-0002-0002-0002-000000000002'::uuid AS marked_by
FROM profiles s
CROSS JOIN courses c
CROSS JOIN (
  SELECT generate_series(
    CURRENT_DATE - 60,
    CURRENT_DATE - 1,
    '3 days'::interval
  )::date AS dt
) d
WHERE s.id::text LIKE 'bb0000%'
  AND c.id::text LIKE 'cccccccc%'
ON CONFLICT (course_id, student_id, date) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 8: Insert assignment_submissions for all 50 students x 18 assignments
-- -----------------------------------------------------------------
INSERT INTO assignment_submissions (assignment_id, student_id, status, marks, notes, submitted_at)
SELECT
  a.id AS assignment_id,
  s.id AS student_id,
  'graded' AS status,
  CASE
    WHEN rk <= 5  THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.95)::int)
    WHEN rk <= 10 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.88)::int)
    WHEN rk <= 18 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.80)::int)
    WHEN rk <= 28 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.72)::int)
    WHEN rk <= 38 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.65)::int)
    WHEN rk <= 46 THEN LEAST(a.max_marks, ROUND(a.max_marks * 0.55)::int)
    ELSE 0
  END AS marks,
  'Submission for ' || a.title AS notes,
  now() - interval '5 days' AS submitted_at
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rk
  FROM profiles
  WHERE id::text LIKE 'bb0000%'
) s
CROSS JOIN (
  SELECT id, course_id, max_marks, title
  FROM assignments
  WHERE id::text LIKE 'aa0000%'
) a
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 9: Insert 12 events (ee000001..ee000012)
-- -----------------------------------------------------------------
INSERT INTO events (id, club_id, organizer_id, title, description, category, location, start_date, end_date, is_paid, fee, max_capacity, registered_count, banner_url, tags, status)
VALUES
  ('ee000001-0000-0000-0000-000000000001'::uuid, 'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Tech Summit 2025', 'Annual technology summit featuring industry speakers and workshops.', 'Technology',
   'Main Auditorium', now() + interval '10 days', now() + interval '11 days',
   true, 50.00, 200, 0,
   'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg',
   ARRAY['tech','summit','innovation'], 'upcoming'),

  ('ee000002-0000-0000-0000-000000000002'::uuid, '17b61561-3f34-43a4-8805-12a508a550ca'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Inter-College Debate Championship', 'Compete against top debaters from universities across the region.', 'Competition',
   'Seminar Hall A', now() + interval '15 days', now() + interval '15 days',
   false, 0, 100, 0,
   'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg',
   ARRAY['debate','competition','public speaking'], 'upcoming'),

  ('ee000003-0000-0000-0000-000000000003'::uuid, 'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Annual Sports Day', 'A day filled with athletic competitions and team sports.', 'Sports',
   'University Sports Ground', now() + interval '20 days', now() + interval '20 days',
   false, 0, 500, 0,
   'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg',
   ARRAY['sports','athletics','competition'], 'upcoming'),

  ('ee000004-0000-0000-0000-000000000004'::uuid, '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Campus Photography Exhibition', 'Showcase your best photographs at our annual gallery event.', 'Arts',
   'Gallery Hall', now() + interval '8 days', now() + interval '9 days',
   false, 0, 150, 0,
   'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg',
   ARRAY['photography','arts','exhibition'], 'upcoming'),

  ('ee000005-0000-0000-0000-000000000005'::uuid, '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Music Fest 2025', 'Live performances from student bands and invited artists.', 'Music',
   'Open Air Theatre', now() + interval '25 days', now() + interval '25 days',
   true, 30.00, 300, 0,
   'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg',
   ARRAY['music','live','performance'], 'upcoming'),

  ('ee000006-0000-0000-0000-000000000006'::uuid, '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Robotics Challenge 2025', 'Build and battle robots in our annual robotics competition.', 'Technology',
   'Engineering Lab Block', now() + interval '30 days', now() + interval '31 days',
   true, 100.00, 80, 0,
   'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg',
   ARRAY['robotics','engineering','competition'], 'upcoming'),

  ('ee000007-0000-0000-0000-000000000007'::uuid, 'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Hackathon 48h', '48-hour coding marathon to solve real-world problems.', 'Technology',
   'CS Department Lab', now() + interval '35 days', now() + interval '37 days',
   false, 0, 120, 0,
   'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg',
   ARRAY['hackathon','coding','technology'], 'upcoming'),

  ('ee000008-0000-0000-0000-000000000008'::uuid, '17b61561-3f34-43a4-8805-12a508a550ca'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Model United Nations', 'Simulate the United Nations General Assembly and debate global issues.', 'Academic',
   'Conference Room 1', now() + interval '40 days', now() + interval '41 days',
   true, 25.00, 90, 0,
   'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg',
   ARRAY['MUN','diplomacy','debate'], 'upcoming'),

  ('ee000009-0000-0000-0000-000000000009'::uuid, 'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Badminton Tournament', 'Singles and doubles badminton tournament open to all students.', 'Sports',
   'Indoor Sports Hall', now() + interval '12 days', now() + interval '13 days',
   false, 0, 64, 0,
   'https://images.pexels.com/photos/3660204/pexels-photo-3660204.jpeg',
   ARRAY['badminton','sports','tournament'], 'upcoming'),

  ('ee000010-0000-0000-0000-000000000010'::uuid, '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Nature Photography Walk', 'Guided campus nature walk with photography tips from experts.', 'Arts',
   'Campus Gardens', now() + interval '5 days', now() + interval '5 days',
   false, 0, 40, 0,
   'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg',
   ARRAY['photography','nature','walk'], 'upcoming'),

  ('ee000011-0000-0000-0000-000000000011'::uuid, '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'Open Mic Night', 'Showcase your talent in poetry, comedy, or music at our open mic.', 'Arts',
   'Student Lounge', now() + interval '7 days', now() + interval '7 days',
   false, 0, 100, 0,
   'https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg',
   ARRAY['open mic','arts','music'], 'upcoming'),

  ('ee000012-0000-0000-0000-000000000012'::uuid, '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
   'AI Workshop Series', 'Hands-on workshops covering machine learning and AI fundamentals.', 'Academic',
   'Seminar Hall B', now() + interval '18 days', now() + interval '18 days',
   true, 20.00, 60, 0,
   'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
   ARRAY['AI','machine learning','workshop'], 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 10: Insert club_prize_pool records for the 6 named clubs
-- -----------------------------------------------------------------
INSERT INTO club_prize_pool (club_id, title, description, prize_amount, prize_type, competition_date, organizer, position, participants, image_url, is_verified, created_by)
VALUES
  ('c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid,
   'National Hackathon 2024 - First Place', 'Won first place at the National Hackathon hosted by IIT.',
   50000, 'cash', CURRENT_DATE - 90, 'IIT National Hackathon Committee', '1st Place',
   ARRAY['Tech Innovators Team Alpha'], 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid,
   'State-Level Tech Quiz - Runner Up', 'Secured second place at the State Technical Quiz Competition.',
   10000, 'cash', CURRENT_DATE - 45, 'State Engineering Association', '2nd Place',
   ARRAY['Tech Innovators Quiz Team'], 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('17b61561-3f34-43a4-8805-12a508a550ca'::uuid,
   'Inter-University Debate Trophy 2024', 'Champions of the annual inter-university debate championship.',
   0, 'trophy', CURRENT_DATE - 120, 'University Debate Council', 'Champions',
   ARRAY['Debate Society Varsity Team'], 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid,
   'Regional Sports Championship - Gold', 'Gold medal at the Regional University Sports Championships.',
   25000, 'cash', CURRENT_DATE - 60, 'Regional Sports Authority', '1st Place',
   ARRAY['Sports Federation Athletics Squad'], 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid,
   'National Photography Contest - Best Campus', 'Best Campus Photography award at national level.',
   0, 'certificate', CURRENT_DATE - 30, 'National Photography Federation', 'Best in Category',
   ARRAY['Photography Club'], 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('187ae20a-572c-4245-b0f6-68eace1adad6'::uuid,
   'State Music Competition - Silver', 'Silver award at the State University Music Festival.',
   15000, 'cash', CURRENT_DATE - 75, 'State Cultural Ministry', '2nd Place',
   ARRAY['Music Ensemble Orchestra'], 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid),

  ('01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid,
   'International Robotics Olympiad - Bronze', 'Bronze medal at the International Robotics Olympiad.',
   0, 'trophy', CURRENT_DATE - 150, 'International Robotics Federation', '3rd Place',
   ARRAY['Robotics Club Team R1'], 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg',
   true, 'aaaaaaaa-0002-0002-0002-000000000002'::uuid);

-- -----------------------------------------------------------------
-- STEP 11: Update the 6 clubs with metadata
-- -----------------------------------------------------------------
UPDATE clubs SET
  founded_year = 2018,
  contact_email = 'techinnovators@university.edu',
  meeting_schedule = 'Every Wednesday 4:00 PM - 6:00 PM, Lab Block C',
  achievements = 'National Hackathon Champions 2024, State Tech Quiz Runner-Up 2024, 3x Campus Innovation Award',
  social_links = '{"instagram":"@tech_innovators_uni","linkedin":"tech-innovators-university","github":"tech-innovators-uni"}'::jsonb,
  prize_pool_total = 60000
WHERE id = 'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid;

UPDATE clubs SET
  founded_year = 2015,
  contact_email = 'debatesociety@university.edu',
  meeting_schedule = 'Every Tuesday and Thursday 5:00 PM - 7:00 PM, Seminar Hall A',
  achievements = 'Inter-University Debate Champions 2024, Regional MUN Best Delegation 2023',
  social_links = '{"instagram":"@debate_society_uni","youtube":"debate-society-university"}'::jsonb,
  prize_pool_total = 0
WHERE id = '17b61561-3f34-43a4-8805-12a508a550ca'::uuid;

UPDATE clubs SET
  founded_year = 2012,
  contact_email = 'sportsfed@university.edu',
  meeting_schedule = 'Daily training 6:00 AM - 8:00 AM, Sports Ground',
  achievements = 'Regional Sports Championship Gold 2024, 5x State Level Medals, University Sports Excellence Award',
  social_links = '{"instagram":"@sports_fed_uni","twitter":"@sports_fed_uni"}'::jsonb,
  prize_pool_total = 25000
WHERE id = 'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid;

UPDATE clubs SET
  founded_year = 2019,
  contact_email = 'photoclub@university.edu',
  meeting_schedule = 'Every Saturday 10:00 AM - 12:00 PM, Gallery Hall',
  achievements = 'National Best Campus Photography 2024, State Photo Exhibition Winner 2023',
  social_links = '{"instagram":"@photo_club_uni","flickr":"photo-club-university"}'::jsonb,
  prize_pool_total = 0
WHERE id = '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid;

UPDATE clubs SET
  founded_year = 2016,
  contact_email = 'musicensemble@university.edu',
  meeting_schedule = 'Every Monday and Friday 4:00 PM - 6:00 PM, Music Room',
  achievements = 'State Music Festival Silver 2024, Campus Cultural Fest Champions 3 years running',
  social_links = '{"instagram":"@music_ensemble_uni","youtube":"music-ensemble-university","spotify":"music-ensemble-uni"}'::jsonb,
  prize_pool_total = 15000
WHERE id = '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid;

UPDATE clubs SET
  founded_year = 2017,
  contact_email = 'roboticsclub@university.edu',
  meeting_schedule = 'Every Wednesday and Saturday 2:00 PM - 5:00 PM, Engineering Lab',
  achievements = 'International Robotics Olympiad Bronze 2024, National Robocon Finalists 2023',
  social_links = '{"instagram":"@robotics_club_uni","github":"robotics-club-uni","youtube":"robotics-club-university"}'::jsonb,
  prize_pool_total = 0
WHERE id = '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid;

-- -----------------------------------------------------------------
-- STEP 12: Add club_members for bb0000* students to the 6 clubs
-- Distribute students across clubs: each student joins 2 clubs (by modulo)
-- -----------------------------------------------------------------
INSERT INTO club_members (club_id, user_id, role)
SELECT
  club_id,
  s.id AS user_id,
  'member' AS role
FROM profiles s
CROSS JOIN (
  VALUES
    ('c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid),
    ('17b61561-3f34-43a4-8805-12a508a550ca'::uuid),
    ('cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid),
    ('751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid),
    ('187ae20a-572c-4245-b0f6-68eace1adad6'::uuid),
    ('01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid)
) AS clubs(club_id)
WHERE s.id::text LIKE 'bb0000%'
  -- Each student joins the club matching their modulo position (2 clubs each)
  AND (
    (RIGHT(s.id::text, 12)::bigint % 6) = CASE club_id
      WHEN 'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid THEN 0
      WHEN '17b61561-3f34-43a4-8805-12a508a550ca'::uuid THEN 1
      WHEN 'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid THEN 2
      WHEN '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid THEN 3
      WHEN '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid THEN 4
      WHEN '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid THEN 5
    END
    OR
    (RIGHT(s.id::text, 12)::bigint % 6) = (CASE club_id
      WHEN 'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid THEN 0
      WHEN '17b61561-3f34-43a4-8805-12a508a550ca'::uuid THEN 1
      WHEN 'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid THEN 2
      WHEN '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid THEN 3
      WHEN '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid THEN 4
      WHEN '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid THEN 5
    END + 3) % 6
  )
ON CONFLICT (club_id, user_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 13: Register students for events (each student registers for
-- events organised by clubs they are members of, plus 2 open events)
-- -----------------------------------------------------------------
-- Register all bb0000* students for the 3 free open events
INSERT INTO event_registrations (event_id, user_id, payment_status)
SELECT
  e.id AS event_id,
  s.id AS user_id,
  'paid' AS payment_status
FROM profiles s
CROSS JOIN events e
WHERE s.id::text LIKE 'bb0000%'
  AND e.id::text IN (
    'ee000003-0000-0000-0000-000000000003',  -- Sports Day (free)
    'ee000004-0000-0000-0000-000000000004',  -- Photography Exhibition (free)
    'ee000010-0000-0000-0000-000000000010'   -- Nature Photography Walk (free)
  )
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Register club members for their club's paid events
INSERT INTO event_registrations (event_id, user_id, payment_status)
SELECT DISTINCT
  e.id AS event_id,
  cm.user_id,
  'paid' AS payment_status
FROM club_members cm
JOIN events e ON e.club_id = cm.club_id
WHERE cm.user_id::text LIKE 'bb0000%'
  AND e.id::text LIKE 'ee0000%'
ON CONFLICT (event_id, user_id) DO NOTHING;

-- -----------------------------------------------------------------
-- STEP 14: Update clubs.member_count
-- -----------------------------------------------------------------
UPDATE clubs
SET member_count = (
  SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = clubs.id
)
WHERE id IN (
  'c1ff552c-fe15-462e-8889-9f26bb964da2'::uuid,
  '17b61561-3f34-43a4-8805-12a508a550ca'::uuid,
  'cbd79bb2-a8a4-467c-bb0d-1127894e26bc'::uuid,
  '751cb9bb-eb4c-4387-8bd0-58f49b964317'::uuid,
  '187ae20a-572c-4245-b0f6-68eace1adad6'::uuid,
  '01629c0f-b05c-4eb3-9256-3d80ffa17a3c'::uuid
);

-- -----------------------------------------------------------------
-- STEP 15: Update events.registered_count
-- -----------------------------------------------------------------
UPDATE events
SET registered_count = (
  SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = events.id
)
WHERE id::text LIKE 'ee0000%';
