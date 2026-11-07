-- The base player-profile migration creates game_invites. Keep this follow-up
-- migration idempotent for databases that applied the earlier PR sequence.
ALTER TABLE "game_invites" ADD COLUMN IF NOT EXISTS "message" text;
