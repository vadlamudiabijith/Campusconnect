/*
  # Add Club Prize Pool and Details

  1. New Tables
    - `club_prize_pool` - tracks prize/award competitions for each club
      - `id` (uuid, primary key)
      - `club_id` (uuid, FK to clubs)
      - `title` (text) - competition or award name
      - `description` (text)
      - `prize_amount` (numeric) - monetary value if any
      - `prize_type` (text) - 'cash', 'trophy', 'certificate', 'scholarship', 'other'
      - `competition_date` (date)
      - `organizer` (text) - who ran the competition
      - `position` (text) - '1st', '2nd', '3rd', 'Winner', 'Finalist', etc.
      - `participants` (text[]) - participant names
      - `image_url` (text)
      - `is_verified` (boolean)
      - `created_by` (uuid, FK to profiles)
      - `created_at` (timestamptz)

  2. New Columns on clubs
    - `achievements` (text) - summary of achievements
    - `founded_year` (integer)
    - `contact_email` (text)
    - `social_links` (jsonb) - instagram, facebook, etc.
    - `prize_pool_total` (numeric) - total prize money won

  3. Security
    - Enable RLS on club_prize_pool
    - Members can read, officers/president can insert/update
*/

-- Club details columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='achievements') THEN
    ALTER TABLE clubs ADD COLUMN achievements text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='founded_year') THEN
    ALTER TABLE clubs ADD COLUMN founded_year integer DEFAULT 2020;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='contact_email') THEN
    ALTER TABLE clubs ADD COLUMN contact_email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='social_links') THEN
    ALTER TABLE clubs ADD COLUMN social_links jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='prize_pool_total') THEN
    ALTER TABLE clubs ADD COLUMN prize_pool_total numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='max_members') THEN
    ALTER TABLE clubs ADD COLUMN max_members integer DEFAULT 100;
  END IF;
END $$;

-- Prize pool table
CREATE TABLE IF NOT EXISTS club_prize_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  prize_amount numeric DEFAULT 0,
  prize_type text DEFAULT 'trophy' CHECK (prize_type = ANY (ARRAY['cash','trophy','certificate','scholarship','other'])),
  competition_date date DEFAULT CURRENT_DATE,
  organizer text DEFAULT '',
  position text DEFAULT 'Winner',
  participants text[] DEFAULT '{}',
  image_url text DEFAULT '',
  is_verified boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE club_prize_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view club prizes"
  ON club_prize_pool FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Club members can add prizes"
  ON club_prize_pool FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_prize_pool.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('officer', 'president')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')
    )
  );

CREATE POLICY "Prize creators and admins can update prizes"
  ON club_prize_pool FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
