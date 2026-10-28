END $body$;

DO $body$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

DO $body$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;

CREATE UNIQUE INDEX IF NOT EXISTS "booking_essentials_unique" ON "booking_essentials" USING btree ("booking_id","venue_essential_id");
CREATE UNIQUE INDEX IF NOT EXISTS "court_slots_unique" ON "court_slots" USING btree ("court_id","date","start_time","end_time");
CREATE UNIQUE INDEX IF NOT EXISTS "venue_essentials_venue_name_unique" ON "venue_essentials" USING btree ("venue_id","name");
CREATE UNIQUE INDEX IF NOT EXISTS "order_essential_unique" ON "on_demand_order_items" USING btree ("order_id","venue_essential_id");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_variant_warehouse_unique" ON "inventory" USING btree ("variant_id","warehouse");
