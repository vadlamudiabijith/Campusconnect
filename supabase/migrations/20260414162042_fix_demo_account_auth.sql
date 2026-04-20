/*
  # Fix Demo Account Authentication

  Updates demo accounts to ensure they can sign in:
  1. Resets passwords using a fresh bcrypt hash
  2. Updates identity_data to include email_verified flag
  3. Ensures email_confirmed_at is set
*/

DO $$
DECLARE
  v_student_uid uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_faculty_uid uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  v_admin_uid uuid   := 'aaaaaaaa-0003-0003-0003-000000000003';
  v_parent_uid uuid  := 'aaaaaaaa-0004-0004-0004-000000000004';
  v_security_uid uuid := 'aaaaaaaa-0005-0005-0005-000000000005';
  v_student2_uid uuid := 'aaaaaaaa-0006-0006-0006-000000000006';
  v_hash text;
BEGIN
  v_hash := crypt('demo1234', gen_salt('bf', 10));

  UPDATE auth.users SET
    encrypted_password = v_hash,
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id IN (v_student_uid, v_faculty_uid, v_admin_uid, v_parent_uid, v_security_uid, v_student2_uid);

  UPDATE auth.identities SET
    identity_data = jsonb_build_object(
      'sub', user_id::text,
      'email', provider_id,
      'email_verified', true,
      'provider', 'email'
    ),
    updated_at = now()
  WHERE provider_id LIKE '%demo.edu';

END $$;
