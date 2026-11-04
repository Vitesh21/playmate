CREATE TYPE "venue_verification_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "venues" ADD COLUMN "verification_status" "venue_verification_status" DEFAULT 'PENDING' NOT NULL;
UPDATE "venues" SET "verification_status" = 'APPROVED';

CREATE TYPE "game_visibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "game_status" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');
CREATE TYPE "game_join_status" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'WAITLISTED', 'LEFT');

CREATE TABLE "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "host_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sport_id" uuid NOT NULL REFERENCES "sports"("id"),
  "venue_id" uuid REFERENCES "venues"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "notes" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "visibility" "game_visibility" DEFAULT 'PUBLIC' NOT NULL,
  "status" "game_status" DEFAULT 'OPEN' NOT NULL,
  "skill_min" text,
  "skill_max" text,
  "max_players" integer NOT NULL,
  "cost_per_player" integer DEFAULT 0 NOT NULL,
  "instant_join" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "games_valid_time_range" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "games_max_players_positive" CHECK ("max_players" >= 2),
  CONSTRAINT "games_cost_nonnegative" CHECK ("cost_per_player" >= 0)
);

CREATE TABLE "game_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "game_join_status" DEFAULT 'REQUESTED' NOT NULL,
  "message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_participants_game_user_unique" UNIQUE ("game_id", "user_id")
);

CREATE INDEX "games_public_search_idx" ON "games" ("visibility", "status", "starts_at");
CREATE INDEX "game_participants_game_status_idx" ON "game_participants" ("game_id", "status");
