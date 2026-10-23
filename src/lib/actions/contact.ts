"use server";

import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { isSupabaseConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import type { FormState } from "./types";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.email("Enter a valid work email."),
  company: z.string().trim().min(2, "Enter your company name.").max(160),
  phone: z.string().trim().max(40),
  teamSize: z.string().trim().max(40),
  message: z.string().trim().max(2000),
  website: z.string().max(0), // honeypot: real people leave it empty
});

/** Public demo-request form (Screen 04). Stored for platform admins only. */
export async function submitDemoRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    if (fieldErrors.website) return { message: "Thanks! We will contact you within one working day." };
    return { fieldErrors };
  }
  if (!isSupabaseConfigured) return { error: "The form is not connected on this demo site. Please email us instead." };

  // Anonymous client: the RPC is the only thing anon may call.
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [], setAll: () => {} } });
  const v = parsed.data;
  const { error } = await supabase.rpc("submit_lead", {
    full_name: v.fullName,
    email: v.email,
    company: v.company,
    phone: v.phone,
    team_size: v.teamSize,
    message: v.message,
  });
  if (error) return { error: error.message.includes("too many") ? "We already have your request. We will be in touch soon." : "Your request could not be sent. Please try again or email us." };
  return { message: "Thanks! We will contact you within one working day to arrange your demo." };
}
