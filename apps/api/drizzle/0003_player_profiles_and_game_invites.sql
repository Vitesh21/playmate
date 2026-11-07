DO $$ BEGIN
  CREATE TYPE user_visibility AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_sports jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_levels jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_times jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility user_visibility NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_visibility user_visibility NOT NULL DEFAULT 'FRIENDS';
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_visibility user_visibility NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reliability_score integer NOT NULL DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_games integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS late_cancel_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE game_invite_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS game_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status game_invite_status NOT NULL DEFAULT 'PENDING',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_invites_unique UNIQUE (game_id, invitee_id),
  CONSTRAINT game_invites_no_self CHECK (inviter_id <> invitee_id)
);

CREATE INDEX IF NOT EXISTS game_invites_invitee_status_idx ON game_invites (invitee_id, status);
