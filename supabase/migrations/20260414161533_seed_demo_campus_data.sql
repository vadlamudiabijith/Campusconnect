/*
  # Seed Demo Campus Data

  Seeds complete demo data including:
  1. Auth users for all 6 demo accounts (student, faculty, admin, parent, security, student2)
  2. Profile records with proper roles
  3. 5 CS courses linked to faculty
  4. Course enrollments for both students
  5. Assignments per course
  6. Timetable entries
  7. Attendance records
  8. Grades
  9. Announcements and materials per course
*/

DO $$
DECLARE
  v_student_uid uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_faculty_uid uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  v_admin_uid uuid   := 'aaaaaaaa-0003-0003-0003-000000000003';
  v_parent_uid uuid  := 'aaaaaaaa-0004-0004-0004-000000000004';
  v_security_uid uuid := 'aaaaaaaa-0005-0005-0005-000000000005';
  v_student2_uid uuid := 'aaaaaaaa-0006-0006-0006-000000000006';
BEGIN

  -- Create auth users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  VALUES
    (v_student_uid,  'student@demo.edu',  crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Alex Johnson"}',  'authenticated', 'authenticated'),
    (v_faculty_uid,  'faculty@demo.edu',  crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Dr. Priya Sharma"}', 'authenticated', 'authenticated'),
    (v_admin_uid,    'admin@demo.edu',    crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Sam Kumar"}',       'authenticated', 'authenticated'),
    (v_parent_uid,   'parent@demo.edu',   crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Raj Johnson"}',     'authenticated', 'authenticated'),
    (v_security_uid, 'security@demo.edu', crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Officer Singh"}',   'authenticated', 'authenticated'),
    (v_student2_uid, 'student2@demo.edu', crypt('demo1234', gen_salt('bf')),  now(), now(), now(), '{"name":"Meera Patel"}',     'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Create auth identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_student_uid,  json_build_object('sub', v_student_uid::text,  'email', 'student@demo.edu'),  'email', 'student@demo.edu',  now(), now(), now()),
    (gen_random_uuid(), v_faculty_uid,  json_build_object('sub', v_faculty_uid::text,  'email', 'faculty@demo.edu'),  'email', 'faculty@demo.edu',  now(), now(), now()),
    (gen_random_uuid(), v_admin_uid,    json_build_object('sub', v_admin_uid::text,    'email', 'admin@demo.edu'),    'email', 'admin@demo.edu',    now(), now(), now()),
    (gen_random_uuid(), v_parent_uid,   json_build_object('sub', v_parent_uid::text,   'email', 'parent@demo.edu'),  'email', 'parent@demo.edu',   now(), now(), now()),
    (gen_random_uuid(), v_security_uid, json_build_object('sub', v_security_uid::text, 'email', 'security@demo.edu'),'email', 'security@demo.edu', now(), now(), now()),
    (gen_random_uuid(), v_student2_uid, json_build_object('sub', v_student2_uid::text, 'email', 'student2@demo.edu'),'email', 'student2@demo.edu', now(), now(), now())
  ON CONFLICT DO NOTHING;

  -- Create profiles
  INSERT INTO profiles (id, name, email, role, student_id, faculty_id, department, bio, parent_of)
  VALUES
    (v_student_uid,  'Alex Johnson',    'student@demo.edu',  'student',  'CS2021001', NULL,      'Computer Science', 'B.Tech CSE Year 3 student', NULL),
    (v_faculty_uid,  'Dr. Priya Sharma','faculty@demo.edu',  'faculty',  NULL,        'FAC001',  'Computer Science', 'Professor with 12 years experience in AI/ML', NULL),
    (v_admin_uid,    'Sam Kumar',       'admin@demo.edu',    'admin',    NULL,        NULL,      'Administration',   'Campus administrator', NULL),
    (v_parent_uid,   'Raj Johnson',     'parent@demo.edu',   'parent',   NULL,        NULL,      NULL,               'Parent of Alex Johnson', 'CS2021001'),
    (v_security_uid, 'Officer Singh',   'security@demo.edu', 'security', NULL,        NULL,      'Security',         'Campus security officer', NULL),
    (v_student2_uid, 'Meera Patel',     'student2@demo.edu', 'student',  'CS2021002', NULL,      'Computer Science', 'B.Tech CSE Year 3 student', NULL)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    student_id = EXCLUDED.student_id,
    department = EXCLUDED.department,
    bio = EXCLUDED.bio,
    parent_of = EXCLUDED.parent_of;

  -- Courses
  INSERT INTO courses (id, code, name, description, faculty_id, credits, semester, color)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001','CS301','Data Structures & Algorithms','Fundamental data structures and algorithm design techniques',v_faculty_uid,4,'Sem 5 2024','#3B82F6'),
    ('cccccccc-0002-0002-0002-000000000002','CS302','Database Management Systems','Relational databases, SQL, and database design principles',v_faculty_uid,4,'Sem 5 2024','#10B981'),
    ('cccccccc-0003-0003-0003-000000000003','CS303','Operating Systems','Process management, memory, file systems, and concurrency',v_faculty_uid,3,'Sem 5 2024','#F59E0B'),
    ('cccccccc-0004-0004-0004-000000000004','CS304','Computer Networks','Networking fundamentals, protocols, and security',v_faculty_uid,3,'Sem 5 2024','#EF4444'),
    ('cccccccc-0005-0005-0005-000000000005','CS305','Machine Learning','Supervised, unsupervised learning and neural networks',v_faculty_uid,4,'Sem 5 2024','#8B5CF6')
  ON CONFLICT (id) DO NOTHING;

  -- Course enrollments for both students
  INSERT INTO course_enrollments (student_id, course_id)
  VALUES
    (v_student_uid, 'cccccccc-0001-0001-0001-000000000001'),
    (v_student_uid, 'cccccccc-0002-0002-0002-000000000002'),
    (v_student_uid, 'cccccccc-0003-0003-0003-000000000003'),
    (v_student_uid, 'cccccccc-0004-0004-0004-000000000004'),
    (v_student_uid, 'cccccccc-0005-0005-0005-000000000005'),
    (v_student2_uid,'cccccccc-0001-0001-0001-000000000001'),
    (v_student2_uid,'cccccccc-0002-0002-0002-000000000002'),
    (v_student2_uid,'cccccccc-0003-0003-0003-000000000003'),
    (v_student2_uid,'cccccccc-0004-0004-0004-000000000004'),
    (v_student2_uid,'cccccccc-0005-0005-0005-000000000005')
  ON CONFLICT DO NOTHING;

  -- Assignments
  INSERT INTO assignments (id, course_id, created_by, title, description, type, due_date, max_marks)
  VALUES
    ('eeeeeeee-0001-0001-0001-000000000001','cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'Sorting Algorithms Implementation','Implement merge sort, quick sort and heap sort in C++','assignment',(now()+interval '7 days')::date,50),
    ('eeeeeeee-0002-0002-0002-000000000002','cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'DSA Mid-Term Quiz','Multiple choice questions on trees and graphs','quiz',(now()+interval '14 days')::date,30),
    ('eeeeeeee-0003-0003-0003-000000000003','cccccccc-0002-0002-0002-000000000002',v_faculty_uid,'Library Management System','Design and implement a complete LMS with SQL','project',(now()+interval '21 days')::date,100),
    ('eeeeeeee-0004-0004-0004-000000000004','cccccccc-0002-0002-0002-000000000002',v_faculty_uid,'DBMS Final Exam','Comprehensive exam on all topics covered','exam',(now()+interval '30 days')::date,75),
    ('eeeeeeee-0005-0005-0005-000000000005','cccccccc-0004-0004-0004-000000000004',v_faculty_uid,'Network Topology Lab','Configure a small network topology using Cisco Packet Tracer','assignment',(now()+interval '14 days')::date,30),
    ('eeeeeeee-0006-0006-0006-000000000006','cccccccc-0005-0005-0005-000000000005',v_faculty_uid,'Linear Regression Implementation','Implement linear and logistic regression from scratch','assignment',(now()+interval '10 days')::date,60),
    ('eeeeeeee-0007-0007-0007-000000000007','cccccccc-0005-0005-0005-000000000005',v_faculty_uid,'ML Mini Project','Build a classification model on a real dataset','project',(now()+interval '25 days')::date,100)
  ON CONFLICT (id) DO NOTHING;

  -- Timetable
  INSERT INTO timetable (course_id, day_of_week, start_time, end_time, room, week_topic)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001','Monday','09:00','10:00','A101','Arrays and Linked Lists'),
    ('cccccccc-0002-0002-0002-000000000002','Monday','11:00','12:00','A102','Normalization'),
    ('cccccccc-0003-0003-0003-000000000003','Tuesday','09:00','10:00','B201','Process Scheduling'),
    ('cccccccc-0004-0004-0004-000000000004','Wednesday','10:00','11:00','B202','TCP/IP Protocols'),
    ('cccccccc-0005-0005-0005-000000000005','Thursday','14:00','15:30','Lab1','Neural Networks'),
    ('cccccccc-0001-0001-0001-000000000001','Friday','09:00','10:00','A101','Trees and Heaps'),
    ('cccccccc-0002-0002-0002-000000000002','Friday','11:00','12:00','A102','SQL Queries')
  ON CONFLICT DO NOTHING;

  -- Attendance records for student 1
  INSERT INTO attendance (course_id, student_id, date, status, marked_by)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001',v_student_uid,(now()-interval '14 days')::date,'present',v_faculty_uid),
    ('cccccccc-0001-0001-0001-000000000001',v_student_uid,(now()-interval '7 days')::date,'present',v_faculty_uid),
    ('cccccccc-0002-0002-0002-000000000002',v_student_uid,(now()-interval '14 days')::date,'present',v_faculty_uid),
    ('cccccccc-0002-0002-0002-000000000002',v_student_uid,(now()-interval '7 days')::date,'late',v_faculty_uid),
    ('cccccccc-0003-0003-0003-000000000003',v_student_uid,(now()-interval '14 days')::date,'absent',v_faculty_uid),
    ('cccccccc-0003-0003-0003-000000000003',v_student_uid,(now()-interval '7 days')::date,'present',v_faculty_uid),
    ('cccccccc-0004-0004-0004-000000000004',v_student_uid,(now()-interval '14 days')::date,'present',v_faculty_uid),
    ('cccccccc-0005-0005-0005-000000000005',v_student_uid,(now()-interval '7 days')::date,'present',v_faculty_uid)
  ON CONFLICT DO NOTHING;

  -- Attendance records for student 2
  INSERT INTO attendance (course_id, student_id, date, status, marked_by)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001',v_student2_uid,(now()-interval '14 days')::date,'present',v_faculty_uid),
    ('cccccccc-0001-0001-0001-000000000001',v_student2_uid,(now()-interval '7 days')::date,'present',v_faculty_uid),
    ('cccccccc-0002-0002-0002-000000000002',v_student2_uid,(now()-interval '14 days')::date,'absent',v_faculty_uid),
    ('cccccccc-0003-0003-0003-000000000003',v_student2_uid,(now()-interval '7 days')::date,'present',v_faculty_uid)
  ON CONFLICT DO NOTHING;

  -- Submissions and grades for student 1
  INSERT INTO assignment_submissions (assignment_id, student_id, status, marks, submitted_at)
  VALUES
    ('eeeeeeee-0001-0001-0001-000000000001',v_student_uid,'graded',42,now()-interval '5 days'),
    ('eeeeeeee-0003-0003-0003-000000000003',v_student_uid,'submitted',NULL,now()-interval '2 days'),
    ('eeeeeeee-0006-0006-0006-000000000006',v_student_uid,'graded',52,now()-interval '3 days')
  ON CONFLICT DO NOTHING;

  -- Grades for student 1
  INSERT INTO grades (course_id, student_id, assignment_id, marks, max_marks, feedback, graded_by)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001',v_student_uid,'eeeeeeee-0001-0001-0001-000000000001',42,50,'Excellent implementation! Clean code with proper comments.',v_faculty_uid),
    ('cccccccc-0005-0005-0005-000000000005',v_student_uid,'eeeeeeee-0006-0006-0006-000000000006',52,60,'Good understanding of gradient descent. Improve vectorization.',v_faculty_uid)
  ON CONFLICT DO NOTHING;

  -- Announcements
  INSERT INTO announcements (course_id, author_id, title, content, pinned)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'Welcome to CS301!','Welcome everyone to Data Structures & Algorithms. Please review the syllabus and come prepared for Monday''s class.',true),
    ('cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'Assignment 1 Released','The first assignment on sorting algorithms is now live. Due in 7 days. Read the problem statement carefully.',false),
    ('cccccccc-0002-0002-0002-000000000002',v_faculty_uid,'DBMS Lab Session','We will have a special lab session this Friday to practice SQL queries. Attendance is mandatory.',true),
    ('cccccccc-0005-0005-0005-000000000005',v_faculty_uid,'ML Resources','I have uploaded lecture slides and the dataset for assignment 2 under Materials. Please download them.',false)
  ON CONFLICT DO NOTHING;

  -- Materials
  INSERT INTO materials (course_id, uploaded_by, title, description, file_url, file_type, module)
  VALUES
    ('cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'DSA Lecture Notes - Week 1','Introduction to arrays, linked lists, stacks and queues','https://drive.google.com/example1','pdf','Week 1'),
    ('cccccccc-0001-0001-0001-000000000001',v_faculty_uid,'Sorting Algorithms Cheatsheet','Quick reference for all sorting algorithms with complexity analysis','https://drive.google.com/example2','pdf','Week 2'),
    ('cccccccc-0002-0002-0002-000000000002',v_faculty_uid,'ER Diagram Tutorial','Step-by-step guide to drawing entity-relationship diagrams','https://drive.google.com/example3','pdf','Week 1'),
    ('cccccccc-0005-0005-0005-000000000005',v_faculty_uid,'ML Fundamentals Slides','Introduction to machine learning concepts and types','https://drive.google.com/example4','pdf','Week 1'),
    ('cccccccc-0005-0005-0005-000000000005',v_faculty_uid,'Dataset - Iris Classification','Classic iris flower classification dataset for practice','https://archive.ics.uci.edu/ml/datasets/iris','link','Week 3')
  ON CONFLICT DO NOTHING;

  -- Payments for student 1
  INSERT INTO payments (user_id, reference_type, amount, description, status, transaction_id, payment_method, currency)
  VALUES
    (v_student_uid,'fee',15000,'Semester 5 Tuition Fee','completed','TXN-IN-'||upper(substring(md5(random()::text),1,8)),'upi:PhonePe','INR'),
    (v_student_uid,'fee',2500,'Library Fee','completed','TXN-IN-'||upper(substring(md5(random()::text),1,8)),'card','INR'),
    (v_student_uid,'fee',1000,'Sports Fee','pending','TXN-IN-'||upper(substring(md5(random()::text),1,8)),'netbanking:SBI','INR')
  ON CONFLICT DO NOTHING;

END $$;
