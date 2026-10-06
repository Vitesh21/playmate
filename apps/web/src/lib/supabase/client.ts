"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export const createClient = () => {
  return createClientComponentClient<Database>();
};
