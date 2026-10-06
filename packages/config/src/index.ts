import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  API_PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),

  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getConfig(overrideEnv: Record<string, string | undefined> = {}): EnvConfig {
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

  if (Object.keys(overrideEnv).length === 0) {
    cachedConfig = parsed.data;
  }

  return parsed.data;
}

export const config = {
  booking: {
    pendingExpiryMinutes: 15,
    refundWindowHours: 24,
  },
  search: {
    defaultPerPage: 10,
    maxPerPage: 100,
  },
  uploads: {
    maxFileSizeMB: 10,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    venuesBucket: "venue-images",
    productsBucket: "product-images",
    avatarsBucket: "user-avatars",
  },
  payments: {
    currency: "INR",
    receiptPrefix: "PMT",
  },
} as const;

export type AppConfig = typeof config;
