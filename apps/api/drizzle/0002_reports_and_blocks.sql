CREATE TYPE "user_report_status" AS ENUM ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED');
CREATE TYPE "user_report_target" AS ENUM ('USER', 'GAME', 'REVIEW');

CREATE TABLE "user_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blocker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_blocks_pair_unique" UNIQUE ("blocker_id", "blocked_user_id"),
  CONSTRAINT "user_blocks_no_self" CHECK ("blocker_id" <> "blocked_user_id")
);

CREATE TABLE "user_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "target_type" "user_report_target" NOT NULL,
  "target_id" text NOT NULL,
  "reason" text NOT NULL,
  "status" "user_report_status" DEFAULT 'OPEN' NOT NULL,
  "resolution_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "user_reports_status_created_idx" ON "user_reports" ("status", "created_at");
