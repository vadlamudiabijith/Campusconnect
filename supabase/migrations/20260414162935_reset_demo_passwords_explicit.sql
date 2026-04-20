/*
  # Reset Demo Account Passwords Explicitly

  Forces a fresh bcrypt hash for all demo accounts using pgcrypto directly.
  Also ensures all required fields for Supabase GoTrue auth are properly set.
*/

UPDATE auth.users
SET
  encrypted_password = crypt('demo1234', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  is_sso_user = false,
  deleted_at = NULL,
  banned_until = NULL,
  updated_at = now()
WHERE id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004',
  'aaaaaaaa-0005-0005-0005-000000000005',
  'aaaaaaaa-0006-0006-0006-000000000006'
);
