-- =====================================================================
--  Playmate — Row-Level Security (RLS) Policies
--  PostgreSQL 15+ | Supabase-managed
--
--  Purpose: double-layer authorization.
--    Layer 1 — NestJS AuthGuard + RolesGuard (route-level, @see auth.guard.ts)
--    Layer 2 — Postgres RLS policies (data-level, this file).
--
--  Even if a route-level guard is accidentally misconfigured, Postgres RLS
--  will refuse rows that the user shouldn't see / mutate.
--
--  RLS relies on the `auth.uid()` (Supabase) being the authenticated user.
--  We also map `auth.jwt() ->> 'user_role'` to check RBAC inside policies.
--
--  Apply after running `drizzle-kit push:pg` to create the tables.
-- =====================================================================

-- --------------------------------------------------------------
-- 1. Enable RLS on every table that carries user-owned data
-- --------------------------------------------------------------
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_slots                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_essentials           ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_essentials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_demand_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_demand_order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------
-- 2. Helper function — expose the user's role from the JWT
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_role',
    'USER'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------------------------------------
-- 3. USERS table — users can see/modify their own profile only.
--    ADMINs see everyone.
-- --------------------------------------------------------------
CREATE POLICY users_select_own ON users
  FOR SELECT USING (
    id = auth.uid() OR current_user_role() = 'ADMIN'
  );

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (
    id = auth.uid() OR current_user_role() = 'ADMIN'
  );

-- --------------------------------------------------------------
-- 4. VENUES — EVERYONE can list active venues.
--    VENUE_OWNERs can edit venues they own.
--    ADMINs can do everything.
-- --------------------------------------------------------------
CREATE POLICY venues_select_public ON venues
  FOR SELECT USING (is_active = true);

CREATE POLICY venues_insert_owner ON venues
  FOR INSERT WITH CHECK (
    current_user_role() IN ('VENUE_OWNER', 'ADMIN')
  );

CREATE POLICY venues_update_owner ON venues
  FOR UPDATE USING (
    owner_id = auth.uid() OR current_user_role() = 'ADMIN'
  );

-- --------------------------------------------------------------
-- 5. BOOKINGS — users see their own bookings.
--    VENUE_OWNER sees bookings for venues they own.
--    ADMIN sees everything.
-- --------------------------------------------------------------
CREATE POLICY bookings_select_scope ON bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM court_slots cs
      JOIN courts c ON c.id = cs.court_id
      JOIN venues v ON v.id = c.venue_id
      WHERE cs.id = bookings.court_slot_id
        AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY bookings_insert_user ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY bookings_update_owner_or_admin ON bookings
  FOR UPDATE USING (
    user_id = auth.uid()
    OR current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM court_slots cs
      JOIN courts c ON c.id = cs.court_id
      JOIN venues v ON v.id = c.venue_id
      WHERE cs.id = bookings.court_slot_id
        AND v.owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------------
-- 6. VENUE_ESSENTIALS — everyone can READ active items.
--    Only the venue_owner (or ADMIN) can create/update items
--    belonging to their venue.
-- --------------------------------------------------------------
CREATE POLICY venue_essentials_select_public ON venue_essentials
  FOR SELECT USING (is_active = true);

CREATE POLICY venue_essentials_insert_owner ON venue_essentials
  FOR INSERT WITH CHECK (
    current_user_role() IN ('VENUE_OWNER', 'ADMIN') AND (
      current_user_role() = 'ADMIN' OR
      EXISTS (
        SELECT 1 FROM venues v
        WHERE v.id = venue_essentials.venue_id
          AND v.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY venue_essentials_update_owner ON venue_essentials
  FOR UPDATE USING (
    current_user_role() = 'ADMIN' OR
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_essentials.venue_id
        AND v.owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------------
-- 7. BOOKING_ESSENTIALS — same visibility scope as the parent
--    booking (customer, venue owner, admin).
-- --------------------------------------------------------------
CREATE POLICY booking_essentials_scope ON booking_essentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_essentials.booking_id AND (
        b.user_id = auth.uid()
        OR current_user_role() = 'ADMIN'
        OR EXISTS (
          SELECT 1 FROM court_slots cs
          JOIN courts c ON c.id = cs.court_id
          JOIN venues v ON v.id = c.venue_id
          WHERE cs.id = b.court_slot_id AND v.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY booking_essentials_insert ON booking_essentials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_essentials.booking_id AND b.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------
-- 8. ON_DEMAND_ORDERS / ITEMS — customer + venue owner + admin
-- --------------------------------------------------------------
CREATE POLICY on_demand_orders_scope ON on_demand_orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR current_user_role() = 'ADMIN'
    OR (
      booking_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM bookings b
        JOIN court_slots cs ON cs.id = b.court_slot_id
        JOIN courts c ON c.id = cs.court_id
        JOIN venues v ON v.id = c.venue_id
        WHERE b.id = on_demand_orders.booking_id AND v.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY on_demand_orders_insert ON on_demand_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY on_demand_order_items_scope ON on_demand_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM on_demand_orders o
      WHERE o.id = on_demand_order_items.order_id AND (
        o.user_id = auth.uid()
        OR current_user_role() = 'ADMIN'
        OR (
          o.booking_id IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM bookings b
            JOIN court_slots cs ON cs.id = b.court_slot_id
            JOIN courts c ON c.id = cs.court_id
            JOIN venues v ON v.id = c.venue_id
            WHERE b.id = o.booking_id AND v.owner_id = auth.uid()
          )
        )
      )
    )
  );

-- --------------------------------------------------------------
-- 9. PRODUCTS / SELLERS — public read, seller owns write
-- --------------------------------------------------------------
CREATE POLICY products_select_public ON products
  FOR SELECT USING (is_published = true);

CREATE POLICY products_insert_seller ON products
  FOR INSERT WITH CHECK (
    current_user_role() IN ('SELLER', 'ADMIN')
  );

CREATE POLICY products_update_seller ON products
  FOR UPDATE USING (
    seller_id = auth.uid() OR current_user_role() = 'ADMIN'
  );

-- --------------------------------------------------------------
-- 10. ORDERS — user sees own orders; ADMIN sees all.
-- --------------------------------------------------------------
CREATE POLICY orders_select_scope ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR current_user_role() = 'ADMIN'
  );

CREATE POLICY orders_insert_user ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());
