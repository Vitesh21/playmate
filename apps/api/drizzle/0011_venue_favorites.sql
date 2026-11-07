CREATE TABLE "venue_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "venue_favorites_user_venue_unique" UNIQUE ("user_id", "venue_id")
);
CREATE INDEX "venue_favorites_user_idx" ON "venue_favorites" ("user_id", "created_at");
