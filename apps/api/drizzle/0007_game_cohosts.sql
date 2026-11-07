CREATE TYPE "game_participant_role" AS ENUM ('HOST', 'COHOST', 'PLAYER');
ALTER TABLE "game_participants" ADD COLUMN "role" "game_participant_role" DEFAULT 'PLAYER' NOT NULL;
UPDATE "game_participants" AS participant SET "role" = 'HOST'
FROM "games" AS game WHERE participant."game_id" = game."id" AND participant."user_id" = game."host_id";
