CREATE TYPE "game_attendance" AS ENUM ('PRESENT', 'NO_SHOW');
ALTER TABLE "game_participants" ADD COLUMN "attendance" "game_attendance";

CREATE TABLE "game_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "rater_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rated_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "skill" smallint NOT NULL,
  "sportsmanship" smallint NOT NULL,
  "punctuality" smallint NOT NULL,
  "host_rating" smallint,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_ratings_rater_target_unique" UNIQUE ("game_id", "rater_id", "rated_user_id"),
  CONSTRAINT "game_ratings_range_check" CHECK ("skill" between 1 and 5 AND "sportsmanship" between 1 and 5 AND "punctuality" between 1 and 5),
  CONSTRAINT "game_ratings_host_range_check" CHECK ("host_rating" IS NULL OR "host_rating" between 1 and 5),
  CONSTRAINT "game_ratings_no_self_check" CHECK ("rater_id" <> "rated_user_id")
);
CREATE INDEX "game_ratings_rated_user_idx" ON "game_ratings" ("rated_user_id");
