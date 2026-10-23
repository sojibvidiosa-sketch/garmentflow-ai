/**
 * The app runs in demo mode until both public Supabase values are set.
 * Both are safe to expose: Row Level Security protects the data.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Cookie remembering which company workspace the user last opened. */
export const ACTIVE_COMPANY_COOKIE = "gf_company";
