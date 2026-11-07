CREATE TYPE "friendship_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TABLE "friendships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "addressee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "friendship_status" DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "friendships_pair_unique" UNIQUE ("requester_id", "addressee_id"),
  CONSTRAINT "friendships_no_self" CHECK ("requester_id" <> "addressee_id")
);
CREATE INDEX "friendships_addressee_status_idx" ON "friendships" ("addressee_id", "status");
CREATE INDEX "friendships_requester_status_idx" ON "friendships" ("requester_id", "status");
