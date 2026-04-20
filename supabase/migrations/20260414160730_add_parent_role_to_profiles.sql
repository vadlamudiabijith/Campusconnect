/*
  # Add parent role to profiles table

  Updates the role check constraint to include 'parent' as a valid role.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['student', 'faculty', 'admin', 'visitor', 'security', 'parent']));
