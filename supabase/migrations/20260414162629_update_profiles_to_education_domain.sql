/*
  # Update Profiles Email to education.edu Domain

  Updates the email field in public.profiles for all demo accounts.
*/

UPDATE public.profiles SET email = 'student@education.edu'  WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';
UPDATE public.profiles SET email = 'faculty@education.edu'  WHERE id = 'aaaaaaaa-0002-0002-0002-000000000002';
UPDATE public.profiles SET email = 'admin@education.edu'    WHERE id = 'aaaaaaaa-0003-0003-0003-000000000003';
UPDATE public.profiles SET email = 'parent@education.edu'   WHERE id = 'aaaaaaaa-0004-0004-0004-000000000004';
UPDATE public.profiles SET email = 'security@education.edu' WHERE id = 'aaaaaaaa-0005-0005-0005-000000000005';
UPDATE public.profiles SET email = 'student2@education.edu' WHERE id = 'aaaaaaaa-0006-0006-0006-000000000006';
