DO $body$ BEGIN
 CREATE TYPE "public"."essential_fulfillment_status" AS ENUM('PENDING', 'PREPARED', 'DELIVERED', 'RETURNED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'VENUE_OWNER', 'SELLER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."essential_pricing_model" AS ENUM('PER_HOUR', 'PER_BOOKING', 'FIXED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."essential_type" AS ENUM('RENT', 'SALE', 'ADDON');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 CREATE TYPE "public"."on_demand_order_status" AS ENUM('PENDING', 'PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;
