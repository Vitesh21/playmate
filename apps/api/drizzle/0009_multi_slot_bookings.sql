CREATE TABLE "booking_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "court_slot_id" uuid NOT NULL REFERENCES "court_slots"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "booking_slots_booking_slot_unique" UNIQUE ("booking_id", "court_slot_id")
);
CREATE INDEX "booking_slots_booking_idx" ON "booking_slots" ("booking_id");
CREATE INDEX "booking_slots_slot_idx" ON "booking_slots" ("court_slot_id");

INSERT INTO "booking_slots" ("booking_id", "court_slot_id")
SELECT "id", "court_slot_id" FROM "bookings"
ON CONFLICT ("booking_id", "court_slot_id") DO NOTHING;
