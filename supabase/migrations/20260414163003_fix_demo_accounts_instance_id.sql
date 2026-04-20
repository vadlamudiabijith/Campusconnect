/*
  # Fix Demo Account instance_id

  Supabase GoTrue requires instance_id = '00000000-0000-0000-0000-000000000000'
  for signInWithPassword to work. Demo accounts had NULL which caused
  "Invalid login credentials" despite correct passwords.
*/

UPDATE auth.users
SET instance_id = '00000000-0000-0000-0000-000000000000'
WHERE id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004',
  'aaaaaaaa-0005-0005-0005-000000000005',
  'aaaaaaaa-0006-0006-0006-000000000006'
);
