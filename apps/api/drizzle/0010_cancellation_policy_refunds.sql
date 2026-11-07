ALTER TABLE "venues" ADD COLUMN "cancellation_policy" jsonb NOT NULL DEFAULT '{"freeCancellationHours":24,"lateRefundPercentage":0}'::jsonb;
ALTER TABLE "bookings" ADD COLUMN "refund_amount" integer NOT NULL DEFAULT 0;
ALTER TYPE "payment_status" ADD VALUE 'PARTIALLY_REFUNDED';
