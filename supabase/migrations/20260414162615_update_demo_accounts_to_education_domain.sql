/*
  # Update Demo Accounts to education.edu Domain

  Changes all demo account emails from @demo.edu to @education.edu domain.
  Also resets passwords, fixes all auth metadata, and ensures accounts work correctly.

  1. Updates auth.users emails
  2. Updates auth.identities provider_id and identity_data
  3. Fixes all required metadata fields for signInWithPassword to work
*/

DO $$
DECLARE
  v_hash text;
BEGIN
  v_hash := crypt('demo1234', gen_salt('bf', 10));

  -- Update emails in auth.users
  UPDATE auth.users SET email = 'student@education.edu',   encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Alex Johnson"}'::jsonb,     aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';
  UPDATE auth.users SET email = 'faculty@education.edu',   encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Dr. Priya Sharma"}'::jsonb, aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0002-0002-0002-000000000002';
  UPDATE auth.users SET email = 'admin@education.edu',     encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Sam Kumar"}'::jsonb,         aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0003-0003-0003-000000000003';
  UPDATE auth.users SET email = 'parent@education.edu',    encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Raj Johnson"}'::jsonb,        aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0004-0004-0004-000000000004';
  UPDATE auth.users SET email = 'security@education.edu',  encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Officer Singh"}'::jsonb,     aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0005-0005-0005-000000000005';
  UPDATE auth.users SET email = 'student2@education.edu',  encrypted_password = v_hash, email_confirmed_at = now(), raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb, raw_user_meta_data = '{"name":"Meera Patel"}'::jsonb,       aud = 'authenticated', role = 'authenticated', updated_at = now() WHERE id = 'aaaaaaaa-0006-0006-0006-000000000006';

  -- Update identities table
  UPDATE auth.identities SET
    provider_id = 'student@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0001-0001-0001-000000000001","email":"student@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0001-0001-0001-000000000001';

  UPDATE auth.identities SET
    provider_id = 'faculty@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0002-0002-0002-000000000002","email":"faculty@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0002-0002-0002-000000000002';

  UPDATE auth.identities SET
    provider_id = 'admin@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0003-0003-0003-000000000003","email":"admin@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0003-0003-0003-000000000003';

  UPDATE auth.identities SET
    provider_id = 'parent@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0004-0004-0004-000000000004","email":"parent@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0004-0004-0004-000000000004';

  UPDATE auth.identities SET
    provider_id = 'security@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0005-0005-0005-000000000005","email":"security@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0005-0005-0005-000000000005';

  UPDATE auth.identities SET
    provider_id = 'student2@education.edu',
    identity_data = '{"sub":"aaaaaaaa-0006-0006-0006-000000000006","email":"student2@education.edu","email_verified":true,"provider":"email"}'::jsonb,
    updated_at = now()
  WHERE user_id = 'aaaaaaaa-0006-0006-0006-000000000006';

END $$;
