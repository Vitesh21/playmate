/**
 * @playmate/config — Zod-validated env vars + static app constants.
 *
 * Two exports:
 *   getConfig()  → parse & fully-validate process.env (or an override map) at call time.
 *                  Throws if anything is missing (fail-fast boot-time is the point).
 *   config       → static, non-secret operational tunables (booking expiry windows,
 *                  bucket names, currency, tax rates). Adjust these WITHOUT env redeploys.
 */

import { z } from "zod";

/**
 * Everything the apps MUST provide at runtime in .env (or Render/Vercel env panel).
 * Every field is validated: URLs parse as URLs, ports coerce to numbers, blanks throw.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // PostgreSQL connection string — expects Supabase pooled or direct URL.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Supabase Project. NEXT_PUBLIC_* vars ship to browser JS (safe).
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  // Service role key: NEVER send to the browser — bypasses RLS. Used only in NestJS.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // NestJS API server config
  API_PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),

  // Razorpay — use TEST-mode keys locally, swap to LIVE in production secret panel.
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),

  // Resend.com transactional email
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // Public site URL (used in email links, Razorpay callback URL building)
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

type EnvConfig = z.infer<typeof envSchema>;

/** Cache the parsed env so repeated calls in hot paths are zero-cost. */
let cachedConfig: EnvConfig | null = null;

/**
 * Read + validate environment variables.
 *
 * @param overrideEnv — ONLY for unit tests; supply a fake env map instead of process.env.
 * @throws Error with a human-readable multi-line report of every missing/malformed var.
 */
export function getConfig(overrideEnv: Record<string, string | undefined> = {}): EnvConfig {
  // Fast path: normal runtime calls → just return the cached singleton.
  if (cachedConfig && Object.keys(overrideEnv).length === 0) {
    return cachedConfig;
  }

  const env = {
    ...process.env,
    ...overrideEnv,
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  // Never cache when caller supplied overrides (that's test-mode behaviour).
  if (Object.keys(overrideEnv).length === 0) {
    cachedConfig = parsed.data;
  }

  return parsed.data;
}

/**
 * Operational knobs. Tweak these freely.
 *
 * All values are `as const` so TypeScript narrows them to literal types
 * (useful for downstream unions / switch exhaustiveness checks).
 */
export const config = {
  booking: {
    // How long a user has to complete Razorpay checkout before the slot is released.
    pendingExpiryMinutes: 15,
    // Full-refund window before scheduled slot start. After this, admin-only partial refunds.
    refundWindowHours: 24,
  },
  search: {
    defaultPerPage: 10,
    maxPerPage: 100,
  },
  uploads: {
    maxFileSizeMB: 10,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    // Must match the bucket names created in the Supabase Storage dashboard.
    venuesBucket: "venue-images",
    productsBucket: "product-images",
    avatarsBucket: "user-avatars",
  },
  payments: {
    currency: "INR",
    // Prefix on every Razorpay `receipt` field for easy reconciliation in their dashboard.
    receiptPrefix: "PMT",
  },
} as const;

export type AppConfig = typeof config;
