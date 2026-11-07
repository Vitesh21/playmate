ALTER TYPE "user_report_target" ADD VALUE 'MESSAGE';
CREATE TYPE "group_role" AS ENUM ('ADMIN', 'MEMBER');

CREATE TABLE "player_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "photo_url" text,
  "rules" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "player_groups"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "group_role" DEFAULT 'MEMBER' NOT NULL,
  "is_muted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_members_group_user_unique" UNIQUE ("group_id", "user_id")
);
CREATE INDEX "group_members_user_idx" ON "group_members" ("user_id");

CREATE TABLE "group_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "player_groups"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_messages_nonempty" CHECK (length(trim("body")) > 0)
);
CREATE INDEX "group_messages_timeline_idx" ON "group_messages" ("group_id", "created_at");
