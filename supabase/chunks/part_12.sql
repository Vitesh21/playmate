END $body$;

DO $body$ BEGIN
 ALTER TABLE "venue_essentials" ADD CONSTRAINT "venue_essentials_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "on_demand_orders" ADD CONSTRAINT "on_demand_orders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "on_demand_orders" ADD CONSTRAINT "on_demand_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "on_demand_orders" ADD CONSTRAINT "on_demand_orders_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "on_demand_order_items" ADD CONSTRAINT "on_demand_order_items_order_id_on_demand_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."on_demand_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "on_demand_order_items" ADD CONSTRAINT "on_demand_order_items_venue_essential_id_venue_essentials_id_fk" FOREIGN KEY ("venue_essential_id") REFERENCES "public"."venue_essentials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
