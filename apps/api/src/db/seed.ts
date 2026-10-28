/**
 * Local development seed.
 *
 * Populates the LOCAL Postgres database (docker-compose `playmate-postgres`)
 * with enough realistic data to browse the app end-to-end:
 *   users → sports → venues → courts → court_slots
 *   categories → products → product_variants → inventory
 *   venue_essentials (pro-shop catalog per venue)
 *
 * It ALSO provisions the demo Supabase Auth accounts (admin / mediator / user)
 * so you can sign in and see each role's UI. Roles are stored in Supabase
 * `app_metadata.role` (server-controlled) and mirrored into `users.role`.
 *
 * The script is IDEMPOTENT: every insert either upserts on a natural key
 * (email / slug / sku) or checks for an existing row first, so it is safe
 * to re-run `pnpm --filter @playmate/api db:seed` as many times as you like.
 */
import * as path from "path";
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, inArray } from "drizzle-orm";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "@playmate/config";
import * as schema from "./schema";

loadDotenv({ path: path.resolve(__dirname, "../../../../.env") });
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// ---------------------------------------------------------------------------
// Demo accounts (identifier → role → UI)
// ---------------------------------------------------------------------------

const DEMO_PASSWORD = "playmate123";

const DEMO_ACCOUNTS = [
  {
    email: "admin@playmate.dev",
    role: "ADMIN" as const,
    firstName: "Ada",
    lastName: "Admin",
    label: "Admin — full access",
  },
  {
    email: "owner@playmate.dev",
    role: "VENUE_OWNER" as const,
    firstName: "Ravi",
    lastName: "Mediator",
    label: "Mediator — posts & manages venues",
  },
  {
    email: "seller@playmate.dev",
    role: "SELLER" as const,
    firstName: "Neha",
    lastName: "Seller",
    label: "Seller — manages product listings",
  },
  {
    email: "demo@playmate.dev",
    role: "USER" as const,
    firstName: "Dev",
    lastName: "Player",
    label: "User — books courts & shops",
  },
];

const SEEDED_EMAILS = DEMO_ACCOUNTS.map((a) => a.email);

/** Format a Date as a local-time `YYYY-MM-DD` string (matches Drizzle `date`). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 0 = Sunday .. 6 = Saturday, always open 06:00 – 22:00. */
const OPERATING_HOURS = Array.from({ length: 7 }, (_, day) => ({
  day,
  openTime: "06:00",
  closeTime: "22:00",
  isClosed: false,
}));

const SPORTS = [
  { name: "Badminton", slug: "badminton", description: "Fast-paced racket sport played on indoor courts." },
  { name: "Tennis", slug: "tennis", description: "Classic racket sport played on hard, clay, or synthetic turf courts." },
  { name: "Football", slug: "football", description: "5-a-side and 7-a-side team sport played on astroturf or grass." },
  { name: "Box Cricket", slug: "cricket", description: "Enclosed turf pitch cricket popular for daily games and tournaments." },
  { name: "Pickleball", slug: "pickleball", description: "Dynamic paddle sport combining elements of tennis, badminton, and ping-pong." },
  { name: "Padel", slug: "padel", description: "Fast glass-walled doubles racket sport sensation." },
  { name: "Basketball", slug: "basketball", description: "Indoor hardwood and outdoor rubberized court team sport." },
  { name: "Table Tennis", slug: "table-tennis", description: "Indoor ITTF approved tables for fast-paced table tennis matches." },
  { name: "Swimming", slug: "swimming", description: "Olympic-sized and temperature-controlled lap pools." },
  { name: "Squash", slug: "squash", description: "High-intensity indoor glass-back squash court sport." },
];

const VENUES = [
  // --- HYDERABAD VENUES (Playo & District style) ---
  {
    name: "Gamepoint HITEC City",
    slug: "gamepoint-hitec-city-hyderabad",
    sportSlug: "badminton",
    description: "Hyderabad's premier multi-sport hub featuring 8 international standard wooden badminton courts, synthetic flooring, pro shop, and AC lounges.",
    address: "Plot 14, Near Mindspace IT Park, HITEC City, Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    latitude: "17.443500",
    longitude: "78.377200",
    phone: "+91 40 4567 8901",
    email: "hitec@gamepointindia.com",
    amenities: ["Parking", "AC", "Shower", "Locker", "Pro Shop", "Cafe", "Coaching", "First Aid"],
    courts: ["Court 1 (Yonex Wooden)", "Court 2 (Yonex Wooden)", "Court 3 (Synthetic BWF)", "Court 4 (Synthetic BWF)"],
    courtType: "Indoor",
    surface: "Synthetic Wood",
    hourlyRate: 450,
  },
  {
    name: "HotFut Gachibowli",
    slug: "hotfut-gachibowli-hyderabad",
    sportSlug: "football",
    description: "Top-tier 5-a-side FIFA standard astroturf football and box cricket arena with high-output LED floodlights and team dugouts.",
    address: "Whitefields, Opp. Botanical Garden Road, Gachibowli",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500084",
    latitude: "17.458900",
    longitude: "78.361200",
    phone: "+91 40 4567 8902",
    email: "gachibowli@hotfut.in",
    amenities: ["Parking", "Floodlights", "Changing Room", "Cafe", "Seating Dugouts", "Water Station"],
    courts: ["Turf Arena A (5v5)", "Turf Arena B (5v5)", "Grand Turf (7v7)"],
    courtType: "Outdoor",
    surface: "FIFA Astroturf",
    hourlyRate: 1200,
  },
  {
    name: "Gachibowli Stadium Tennis Complex",
    slug: "gachibowli-tennis-complex-hyderabad",
    sportSlug: "tennis",
    description: "Tournament-grade ITF standard synthetic hard tennis courts with professional floodlights used for national championships.",
    address: "GMC Balayogi Athletic Stadium Complex, Gachibowli",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
    latitude: "17.441100",
    longitude: "78.349800",
    phone: "+91 40 4567 8903",
    email: "tennis@telanganasports.gov.in",
    amenities: ["Parking", "Floodlights", "Shower", "Locker", "Spectator Stands", "Pro Shop"],
    courts: ["Centre Court (Hard)", "Court 2 (Hard)", "Court 3 (Hard)"],
    courtType: "Outdoor",
    surface: "DecoTurf Hard",
    hourlyRate: 500,
  },
  {
    name: "The Padel & Pickleball Club Jubilee Hills",
    slug: "padel-pickleball-club-jubilee-hills-hyderabad",
    sportSlug: "pickleball",
    description: "Trendy rooftop sports destination in upscale Jubilee Hills featuring panoramic city views, USAPA certified pickleball courts, and panoramic padel glass cages.",
    address: "Road No. 36, Near Peddamma Temple Metro, Jubilee Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    latitude: "17.432500",
    longitude: "78.407100",
    phone: "+91 40 4567 8904",
    email: "play@thepadelclubhyd.com",
    amenities: ["Valet Parking", "AC Lounge", "Pro Shop", "Gourmet Cafe", "Floodlights", "Equipment Rental"],
    courts: ["Pickleball Court 1", "Pickleball Court 2", "Pickleball Court 3"],
    courtType: "Outdoor",
    surface: "Cushioned Acrylic",
    hourlyRate: 600,
  },
  {
    name: "SkyTurf Box Cricket & Football",
    slug: "skyturf-box-cricket-kondapur-hyderabad",
    sportSlug: "cricket",
    description: "High-net enclosed box cricket turf with bowling machine, fast replay cameras, live scoreboards, and seamless floodlights in Kondapur.",
    address: "Raghava Colony, Near KIMS Hospital, Kondapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500084",
    latitude: "17.468200",
    longitude: "78.358400",
    phone: "+91 40 4567 8905",
    email: "bookings@skyturfcourt.com",
    amenities: ["Parking", "Floodlights", "Bowling Machine", "Digital Scoreboard", "Seating Lounge"],
    courts: ["Cricket Pitch 1", "Cricket Pitch 2"],
    courtType: "Outdoor",
    surface: "High-density Turf",
    hourlyRate: 1000,
  },
  {
    name: "Flying Shuttle Badminton Academy",
    slug: "flying-shuttle-badminton-madhapur-hyderabad",
    sportSlug: "badminton",
    description: "6 BWF approved wooden shock-absorbing courts, anti-glare LED illumination, and international coaches just 500m from Durgam Cheruvu Metro.",
    address: "Hitech City Main Rd, Kavuri Hills, Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    latitude: "17.439800",
    longitude: "78.390800",
    phone: "+91 40 4567 8906",
    email: "info@flyingshuttlehyd.com",
    amenities: ["Parking", "AC", "Shower", "Locker", "Racket Stringing", "Pro Shop"],
    courts: ["Court 1 (BWF Cushion)", "Court 2 (BWF Cushion)", "Court 3 (BWF Cushion)"],
    courtType: "Indoor",
    surface: "BWF Approved Mat",
    hourlyRate: 400,
  },
  {
    name: "Hoops Hub Gachibowli",
    slug: "hoops-hub-hyderabad",
    sportSlug: "basketball",
    description: "Air-conditioned indoor basketball arena in Financial District / Gachibowli with NBA regulation hardwood floor and glass backboards.",
    address: "7 Financial District Main Road, Nanakramguda, Gachibowli",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
    latitude: "17.419500",
    longitude: "78.348200",
    phone: "+91 40 4000 6000",
    email: "hoops@hoopshub.dev",
    amenities: ["AC", "Parking", "Locker", "Pro Shop", "Showers", "Drinking Water"],
    courts: ["Full Court (NBA Spec)", "Half Court A", "Half Court B"],
    courtType: "Indoor",
    surface: "Maple Hardwood",
    hourlyRate: 800,
  },
  {
    name: "Spin Art Table Tennis Arena",
    slug: "spin-art-tt-arena-banjara-hills-hyderabad",
    sportSlug: "table-tennis",
    description: "Centrally air-conditioned table tennis facility in Banjara Hills with 6 Stag Americas 16 tables, red taraflex flooring, and robot ball feeder.",
    address: "Road No. 12, Near MLA Colony, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    latitude: "17.415600",
    longitude: "78.435000",
    phone: "+91 40 4567 8907",
    email: "spinarttt@hydsports.com",
    amenities: ["AC", "Parking", "Robot Feeder", "Locker", "Pro Shop"],
    courts: ["Table 1 (Stag Pro)", "Table 2 (Stag Pro)", "Table 3 (Stag Pro)"],
    courtType: "Indoor",
    surface: "Taraflex Sports Floor",
    hourlyRate: 250,
  },

  // --- OTHER METROS (Bengaluru / Mumbai / Delhi) ---
  {
    name: "Smash Arena",
    slug: "smash-arena-bengaluru",
    sportSlug: "badminton",
    description: "Premium indoor badminton facility with 6 wooden courts and pro coaching.",
    address: "12 MG Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    latitude: "12.971600",
    longitude: "77.594600",
    phone: "+91 80 4000 1000",
    email: "hello@smasharena.dev",
    amenities: ["Parking", "AC", "Shower", "Locker", "Pro Shop", "Cafe"],
    courts: ["Court 1", "Court 2", "Court 3"],
    courtType: "Indoor",
    surface: "Synthetic Wood",
    hourlyRate: 400,
  },
  {
    name: "Court Side Club",
    slug: "court-side-club-bengaluru",
    sportSlug: "tennis",
    description: "Hard-court tennis club with floodlit evening play and coaching academy.",
    address: "88 Koramangala 5th Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560095",
    latitude: "12.935200",
    longitude: "77.624500",
    phone: "+91 80 4000 3000",
    email: "info@courtsideclub.dev",
    amenities: ["Parking", "Floodlights", "Shower", "Pro Shop"],
    courts: ["Court A", "Court B", "Court C"],
    courtType: "Outdoor",
    surface: "Hard",
    hourlyRate: 600,
  },
  {
    name: "Turf 360",
    slug: "turf-360-mumbai",
    sportSlug: "football",
    description: "5-a-side and 7-a-side astroturf pitches available for hourly hire.",
    address: "21 Carter Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    latitude: "19.059600",
    longitude: "72.829500",
    phone: "+91 22 4000 5000",
    email: "book@turf360.dev",
    amenities: ["Parking", "Floodlights", "Changing Room", "Cafe"],
    courts: ["Turf 1", "Turf 2", "Turf 3"],
    courtType: "Outdoor",
    surface: "Astroturf",
    hourlyRate: 1200,
  },
];

const CATEGORIES = [
  { name: "Rackets", slug: "rackets", sortOrder: 1, parentSlug: null },
  { name: "Badminton Rackets", slug: "badminton-rackets", sortOrder: 1, parentSlug: "rackets" },
  { name: "Tennis Rackets", slug: "tennis-rackets", sortOrder: 2, parentSlug: "rackets" },
  { name: "Shuttlecocks & Balls", slug: "shuttlecocks-balls", sortOrder: 2, parentSlug: null },
  { name: "Apparel", slug: "apparel", sortOrder: 3, parentSlug: null },
  { name: "Footwear", slug: "footwear", sortOrder: 4, parentSlug: null },
  { name: "Accessories", slug: "accessories", sortOrder: 5, parentSlug: null },
];

const PRODUCTS = [
  {
    name: "Yonex Astrox 99 Pro",
    slug: "yonex-astrox-99-pro",
    categorySlug: "badminton-rackets",
    brand: "Yonex",
    description: "Head-heavy attacking badminton racket used by world-class smashers.",
    averageRating: "4.8",
    reviewCount: 124,
    variants: [
      { sku: "YON-AX99-4U", size: "4U", color: "White Tiger", price: 18490, compareAtPrice: 21990, stock: 12 },
    ],
  },
  {
    name: "Yonex Nanoflare 800",
    slug: "yonex-nanoflare-800",
    categorySlug: "badminton-rackets",
    brand: "Yonex",
    description: "Speed-oriented head-light racket for fast doubles play.",
    averageRating: "4.6",
    reviewCount: 89,
    variants: [
      { sku: "YON-NF800-4U", size: "4U", color: "Black", price: 13990, compareAtPrice: 15990, stock: 18 },
    ],
  },
  {
    name: "Li-Ning G-Force 3800",
    slug: "li-ning-g-force-3800",
    categorySlug: "badminton-rackets",
    brand: "Li-Ning",
    description: "Value-for-money carbon racket perfect for club players.",
    averageRating: "4.4",
    reviewCount: 56,
    variants: [
      { sku: "LN-GF3800-3U", size: "3U", color: "Blue", price: 3299, compareAtPrice: 4299, stock: 30 },
    ],
  },
  {
    name: "Yonex Aerosensa 20 Shuttlecocks",
    slug: "yonex-aerosensa-20",
    categorySlug: "shuttlecocks-balls",
    brand: "Yonex",
    description: "Tournament-grade goose feather shuttles (tube of 12).",
    averageRating: "4.7",
    reviewCount: 210,
    variants: [
      { sku: "YON-AS20-12", size: "12 pcs", color: null, price: 1150, compareAtPrice: null, stock: 60 },
    ],
  },
  {
    name: "Babolat Pure Drive",
    slug: "babolat-pure-drive",
    categorySlug: "tennis-rackets",
    brand: "Babolat",
    description: "Explosive power and spin — a modern tennis classic.",
    averageRating: "4.9",
    reviewCount: 74,
    variants: [
      { sku: "BAB-PD-300", size: "Grip 3", color: "Blue/Black", price: 19999, compareAtPrice: 22999, stock: 8 },
    ],
  },
  {
    name: "Nike Dri-FIT Court Tee",
    slug: "nike-dri-fit-court-tee",
    categorySlug: "apparel",
    brand: "Nike",
    description: "Sweat-wicking training tee for court sports.",
    averageRating: "4.3",
    reviewCount: 40,
    variants: [
      { sku: "NIKE-DFT-S", size: "S", color: "Black", price: 1799, compareAtPrice: 2499, stock: 25 },
      { sku: "NIKE-DFT-M", size: "M", color: "Black", price: 1799, compareAtPrice: 2499, stock: 30 },
      { sku: "NIKE-DFT-L", size: "L", color: "White", price: 1799, compareAtPrice: 2499, stock: 20 },
    ],
  },
  {
    name: "Adidas Barricade 13",
    slug: "adidas-barricade-13",
    categorySlug: "footwear",
    brand: "Adidas",
    description: "Stable court shoe built for lateral movement.",
    averageRating: "4.5",
    reviewCount: 65,
    variants: [
      { sku: "ADI-BAR13-9", size: "UK 9", color: "Core Black", price: 8999, compareAtPrice: 10999, stock: 14 },
      { sku: "ADI-BAR13-10", size: "UK 10", color: "Core Black", price: 8999, compareAtPrice: 10999, stock: 10 },
    ],
  },
  {
    name: "Wilson Pro Overgrip (3-Pack)",
    slug: "wilson-pro-overgrip-3pack",
    categorySlug: "accessories",
    brand: "Wilson",
    description: "Tacky, absorbent overgrips — pack of three.",
    averageRating: "4.6",
    reviewCount: 150,
    variants: [
      { sku: "WIL-POG-3", size: "One Size", color: "White", price: 650, compareAtPrice: 850, stock: 80 },
    ],
  },
];

/** Pro-shop catalog keyed by sport slug; applied to every venue of that sport. */
const ESSENTIALS_BY_SPORT: Record<
  string,
  Array<{
    name: string;
    description: string;
    type: "RENT" | "SALE" | "ADDON";
    pricingModel: "PER_HOUR" | "PER_BOOKING" | "FIXED";
    price: number;
    compareAtPrice?: number;
    stockQuantity: number;
    maxPerBooking: number;
    tags: string[];
    categories: string[];
  }>
> = {
  badminton: [
    {
      name: "Badminton Racket (Rental)",
      description: "Yonex GR-303 rental racket, freshly gripped.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 100,
      stockQuantity: 15,
      maxPerBooking: 4,
      tags: ["Most booked"],
      categories: ["Rackets"],
    },
    {
      name: "Feather Shuttlecock Tube",
      description: "Tube of 12 tournament feather shuttles.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 250,
      compareAtPrice: 300,
      stockQuantity: 40,
      maxPerBooking: 6,
      tags: ["Most booked"],
      categories: ["Shuttlecocks"],
    },
    {
      name: "Grip Tape",
      description: "Anti-slip overgrip, apply in seconds.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 60,
      stockQuantity: 100,
      maxPerBooking: 10,
      tags: [],
      categories: ["Accessories"],
    },
    {
      name: "Water Bottle 1L",
      description: "Chilled bottled water delivered to your court.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 40,
      stockQuantity: 200,
      maxPerBooking: 10,
      tags: ["Beginners pick"],
      categories: ["Refreshments"],
    },
    {
      name: "Court Shoes (Rental)",
      description: "Non-marking indoor court shoes, sizes UK 7–11.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 150,
      stockQuantity: 8,
      maxPerBooking: 2,
      tags: ["Stock low"],
      categories: ["Footwear"],
    },
  ],
  tennis: [
    {
      name: "Tennis Racket (Rental)",
      description: "Babolat Boost rental racket with fresh grip.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 200,
      stockQuantity: 10,
      maxPerBooking: 2,
      tags: ["Most booked"],
      categories: ["Rackets"],
    },
    {
      name: "Tennis Ball Can (3)",
      description: "Pressurised tennis balls, can of three.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 350,
      stockQuantity: 30,
      maxPerBooking: 4,
      tags: [],
      categories: ["Balls"],
    },
    {
      name: "Microfibre Towel",
      description: "Quick-dry sports towel.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 120,
      stockQuantity: 25,
      maxPerBooking: 4,
      tags: ["Beginners pick"],
      categories: ["Accessories"],
    },
    {
      name: "Water Bottle 1L",
      description: "Chilled bottled water delivered to your court.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 40,
      stockQuantity: 200,
      maxPerBooking: 10,
      tags: [],
      categories: ["Refreshments"],
    },
  ],
  football: [
    {
      name: "Football (Rental)",
      description: "Size 5 match ball for your game.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 150,
      stockQuantity: 12,
      maxPerBooking: 2,
      tags: ["Most booked"],
      categories: ["Balls"],
    },
    {
      name: "Training Bibs (Set of 10)",
      description: "Reversible bibs for two teams.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 200,
      stockQuantity: 6,
      maxPerBooking: 2,
      tags: [],
      categories: ["Apparel"],
    },
    {
      name: "Sports Tape",
      description: "Self-adhesive strapping tape.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 80,
      stockQuantity: 50,
      maxPerBooking: 4,
      tags: ["Beginners pick"],
      categories: ["Accessories"],
    },
    {
      name: "Water Bottle 1L",
      description: "Chilled bottled water delivered to your pitch.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 40,
      stockQuantity: 200,
      maxPerBooking: 10,
      tags: [],
      categories: ["Refreshments"],
    },
  ],
  basketball: [
    {
      name: "Basketball (Rental)",
      description: "Size 7 indoor/outdoor basketball.",
      type: "RENT",
      pricingModel: "PER_BOOKING",
      price: 100,
      stockQuantity: 10,
      maxPerBooking: 2,
      tags: ["Most booked"],
      categories: ["Balls"],
    },
    {
      name: "Ankle Support (Pair)",
      description: "Elastic ankle supports for extra stability.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 250,
      stockQuantity: 20,
      maxPerBooking: 2,
      tags: ["Beginners pick"],
      categories: ["Accessories"],
    },
    {
      name: "Water Bottle 1L",
      description: "Chilled bottled water delivered to your court.",
      type: "SALE",
      pricingModel: "FIXED",
      price: 40,
      stockQuantity: 200,
      maxPerBooking: 10,
      tags: [],
      categories: ["Refreshments"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Supabase Auth provisioning
// ---------------------------------------------------------------------------

/**
 * Create the demo Supabase user (or update it if it already exists) and make
 * sure `app_metadata.role` is set — that is the authoritative role source.
 * Returns the Supabase user id.
 */
async function ensureSupabaseUser(
  client: SupabaseClient,
  account: (typeof DEMO_ACCOUNTS)[number],
): Promise<string> {
  const metadata = {
    user_metadata: { firstName: account.firstName, lastName: account.lastName },
    app_metadata: { role: account.role },
  };

  const created = await client.auth.admin.createUser({
    email: account.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    ...metadata,
  });

  if (!created.error && created.data?.user) {
    // Some Supabase versions ignore app_metadata on create → set it explicitly.
    await client.auth.admin.updateUserById(created.data.user.id, metadata);
    return created.data.user.id;
  }

  // Already registered → locate and refresh the password + role.
  const list = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.data?.users?.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase(),
  );
  if (!existing) {
    throw created.error ?? new Error(`Could not provision Supabase user ${account.email}`);
  }
  await client.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD, ...metadata });
  return existing.id;
}

// ---------------------------------------------------------------------------
// Seed routine
// ---------------------------------------------------------------------------

async function seed(db: DrizzleDb, supabase: SupabaseClient) {
  // ---- 1. Demo accounts: Supabase Auth + local users (aligned ids) ----
  const userIdByEmail = new Map<string, string>();
  for (const account of DEMO_ACCOUNTS) {
    const id = await ensureSupabaseUser(supabase, account);
    userIdByEmail.set(account.email, id);
    console.log(`  supabase auth: ${account.email} (${account.role})`);
  }

  // Drop any previously-seeded local rows that used a different id, after
  // detaching references, so we can re-insert with the Supabase ids.
  await db.update(schema.venues).set({ ownerId: null });
  await db.update(schema.products).set({ sellerId: null });
  await db.delete(schema.users).where(inArray(schema.users.email, SEEDED_EMAILS));

  for (const account of DEMO_ACCOUNTS) {
    await db.insert(schema.users).values({
      id: userIdByEmail.get(account.email)!,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      role: account.role as any,
    });
  }
  // Any other local rows that used these emails are gone; roles are enforced
  // from app_metadata by AuthGuard regardless.
  const mediatorId = userIdByEmail.get("owner@playmate.dev")!;
  const sellerId = userIdByEmail.get("seller@playmate.dev")!;
  const adminId = userIdByEmail.get("admin@playmate.dev")!;
  console.log(`  users: ${DEMO_ACCOUNTS.length}`);

  // ---- 2. Sports ----
  const sportBySlug = new Map<string, string>();
  for (const s of SPORTS) {
    const [row] = await db
      .insert(schema.sports)
      .values(s)
      .onConflictDoUpdate({
        target: schema.sports.slug,
        set: { name: s.name, description: s.description, updatedAt: new Date() },
      })
      .returning();
    sportBySlug.set(s.slug, row!.id);
  }
  console.log(`  sports: ${SPORTS.length}`);

  // ---- 3. Venues + courts + slots (owned by the mediator) ----
  let courtCount = 0;
  let slotCount = 0;
  const today = new Date();

  for (const v of VENUES) {
    const sportId = sportBySlug.get(v.sportSlug)!;
    const [venue] = await db
      .insert(schema.venues)
      .values({
        name: v.name,
        slug: v.slug,
        description: v.description,
        sportId,
        address: v.address,
        city: v.city,
        state: v.state,
        pincode: v.pincode,
        latitude: v.latitude,
        longitude: v.longitude,
        phone: v.phone,
        email: v.email,
        images: [],
        amenities: v.amenities,
        operatingHours: OPERATING_HOURS,
        ownerId: mediatorId,
      })
      .onConflictDoUpdate({
        target: schema.venues.slug,
        set: {
          name: v.name,
          description: v.description,
          sportId,
          address: v.address,
          city: v.city,
          state: v.state,
          pincode: v.pincode,
          amenities: v.amenities,
          operatingHours: OPERATING_HOURS,
          ownerId: mediatorId,
          updatedAt: new Date(),
        },
      })
      .returning();

    for (const courtName of v.courts) {
      // courts has no natural unique key → look up before inserting
      const [existing] = await db
        .select({ id: schema.courts.id })
        .from(schema.courts)
        .where(and(eq(schema.courts.venueId, venue!.id), eq(schema.courts.name, courtName)))
        .limit(1);

      let courtId = existing?.id;
      if (!courtId) {
        const [created] = await db
          .insert(schema.courts)
          .values({
            venueId: venue!.id,
            name: courtName,
            type: v.courtType,
            surface: v.surface,
            hourlyRate: v.hourlyRate,
          })
          .returning({ id: schema.courts.id });
        courtId = created!.id;
      }
      courtCount++;

      // Court slots: next 7 days, hourly 06:00 → 22:00
      const slotRows: (typeof schema.courtSlots.$inferInsert)[] = [];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        const dateStr = toDateStr(d);
        for (let hour = 6; hour < 22; hour++) {
          const startTime = `${String(hour).padStart(2, "0")}:00`;
          const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
          slotRows.push({
            courtId,
            date: dateStr,
            startTime,
            endTime,
            isAvailable: true,
            price: v.hourlyRate,
          });
        }
      }
      await db
        .insert(schema.courtSlots)
        .values(slotRows)
        .onConflictDoNothing({
          target: [
            schema.courtSlots.courtId,
            schema.courtSlots.date,
            schema.courtSlots.startTime,
            schema.courtSlots.endTime,
          ],
        });
      slotCount += slotRows.length;
    }
  }
  console.log(`  venues: ${VENUES.length} (owner: mediator) · courts: ${courtCount} · slots: ${slotCount}`);

  // ---- 4. Categories ----
  const categoryBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const parentId = c.parentSlug ? categoryBySlug.get(c.parentSlug) ?? null : null;
    const [row] = await db
      .insert(schema.categories)
      .values({ name: c.name, slug: c.slug, sortOrder: c.sortOrder, parentId })
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: c.name, sortOrder: c.sortOrder, parentId, updatedAt: new Date() },
      })
      .returning();
    categoryBySlug.set(c.slug, row!.id);
  }
  console.log(`  categories: ${CATEGORIES.length}`);

  // ---- 5. Products + variants + inventory ----
  let variantCount = 0;
  for (const p of PRODUCTS) {
    const categoryId = categoryBySlug.get(p.categorySlug)!;
    const [product] = await db
      .insert(schema.products)
      .values({
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId,
        brand: p.brand,
        images: [],
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        sellerId,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: p.name,
          description: p.description,
          categoryId,
          brand: p.brand,
          averageRating: p.averageRating,
          reviewCount: p.reviewCount,
          sellerId,
          updatedAt: new Date(),
        },
      })
      .returning();

    for (const variant of p.variants) {
      const [v] = await db
        .insert(schema.productVariants)
        .values({
          productId: product!.id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
        })
        .onConflictDoUpdate({
          target: schema.productVariants.sku,
          set: { price: variant.price, compareAtPrice: variant.compareAtPrice, updatedAt: new Date() },
        })
        .returning();
      variantCount++;

      await db
        .insert(schema.inventory)
        .values({ variantId: v!.id, quantity: variant.stock, reservedQuantity: 0, warehouse: "MAIN" })
        .onConflictDoUpdate({
          target: [schema.inventory.variantId, schema.inventory.warehouse],
          set: { quantity: variant.stock, updatedAt: new Date() },
        });
    }
  }
  console.log(`  products: ${PRODUCTS.length} (seller: seller) · variants: ${variantCount}`);

  // ---- 6. Venue essentials (pro shop) ----
  let essentialCount = 0;
  for (const v of VENUES) {
    const sportId = sportBySlug.get(v.sportSlug)!;
    const [venueRow] = await db
      .select({ id: schema.venues.id })
      .from(schema.venues)
      .where(eq(schema.venues.slug, v.slug))
      .limit(1);

    const items = ESSENTIALS_BY_SPORT[v.sportSlug] ?? [];
    for (const item of items) {
      await db
        .insert(schema.venueEssentials)
        .values({
          venueId: venueRow!.id,
          sportId,
          name: item.name,
          description: item.description,
          type: item.type,
          pricingModel: item.pricingModel,
          price: item.price,
          compareAtPrice: item.compareAtPrice ?? null,
          stockQuantity: item.stockQuantity,
          maxPerBooking: item.maxPerBooking,
          tags: item.tags,
          categories: item.categories,
        })
        .onConflictDoUpdate({
          target: [schema.venueEssentials.venueId, schema.venueEssentials.name],
          set: {
            description: item.description,
            type: item.type,
            pricingModel: item.pricingModel,
            price: item.price,
            compareAtPrice: item.compareAtPrice ?? null,
            stockQuantity: item.stockQuantity,
            maxPerBooking: item.maxPerBooking,
            tags: item.tags,
            categories: item.categories,
            updatedAt: new Date(),
          },
        });
      essentialCount++;
    }
  }
  console.log(`  venue essentials: ${essentialCount}`);
  console.log(`  admin account: ${adminId} (unused here, reserved for admin-only data)`);
}

async function main() {
  const cfg = getConfig();
  const client = postgres(cfg.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  if (typeof (globalThis as any).WebSocket === "undefined") {
    (globalThis as any).WebSocket = class MockWebSocket {};
  }
  const supabase = createClient(cfg.NEXT_PUBLIC_SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Seeding local database + demo accounts...");
  console.log(`  (demo password for every account: ${DEMO_PASSWORD})`);
  try {
    await seed(db as unknown as DrizzleDb, supabase);
    console.log("Seed completed successfully.");
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    await client.end();
    process.exit(1);
  }
}

main();
