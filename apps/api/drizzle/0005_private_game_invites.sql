CREATE TYPE "game_invite_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "game_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "inviter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "invitee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "game_invite_status" DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_invites_game_invitee_unique" UNIQUE ("game_id", "invitee_id")
);
CREATE INDEX "game_invites_invitee_status_idx" ON "game_invites" ("invitee_id", "status");
