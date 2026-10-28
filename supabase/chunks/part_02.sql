DO $body$ BEGIN
 CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."payment_method" AS ENUM('RAZORPAY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'GENERAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

CREATE TABLE IF NOT EXISTS "booking_essentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"venue_essential_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"duration_hours" integer,
	"unit_price_snapshot" integer NOT NULL,
	"line_total" integer NOT NULL,
	"name_snapshot" text NOT NULL,
	"type_snapshot" text NOT NULL,
	"pricing_model_snapshot" text NOT NULL,
	"fulfillment_status" "essential_fulfillment_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
