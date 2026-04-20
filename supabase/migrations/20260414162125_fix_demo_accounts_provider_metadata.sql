/*
  # Fix Demo Account Provider Metadata

  Supabase signInWithPassword requires correct provider metadata on auth.users.
  Updates raw_app_meta_data and raw_user_meta_data to include the email provider info.
*/

UPDATE auth.users SET
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  aud = 'authenticated',
  role = 'authenticated'
WHERE email LIKE '%demo.edu';

UPDATE auth.users SET raw_user_meta_data = '{"name":"Alex Johnson"}'::jsonb       WHERE email = 'student@demo.edu';
UPDATE auth.users SET raw_user_meta_data = '{"name":"Dr. Priya Sharma"}'::jsonb   WHERE email = 'faculty@demo.edu';
UPDATE auth.users SET raw_user_meta_data = '{"name":"Sam Kumar"}'::jsonb           WHERE email = 'admin@demo.edu';
UPDATE auth.users SET raw_user_meta_data = '{"name":"Raj Johnson"}'::jsonb         WHERE email = 'parent@demo.edu';
UPDATE auth.users SET raw_user_meta_data = '{"name":"Officer Singh"}'::jsonb       WHERE email = 'security@demo.edu';
UPDATE auth.users SET raw_user_meta_data = '{"name":"Meera Patel"}'::jsonb         WHERE email = 'student2@demo.edu';
