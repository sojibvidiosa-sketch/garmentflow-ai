"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_COMPANY_COOKIE, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

const NOT_CONFIGURED: FormState = { error: "Sign-in is not connected yet. Explore the demo workspace instead." };

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Only allow redirects to paths inside this app. */
function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard") {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

const email = z.email("Enter a valid work email address.").transform((v) => v.trim().toLowerCase());
const password = z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long.");

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirm your email first — check your inbox for the link we sent." };
    if (error.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
    return { error: "Email or password is incorrect." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your full name.").max(120),
      companyName: z.string().trim().min(2, "Enter your buying house name.").max(120),
      email,
      password,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { fullName, companyName } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: fullName, company_name: companyName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: "Choose a stronger password." } };
    if (error.status === 429) return { error: "Too many sign-up attempts. Try again in a few minutes." };
    return { error: "We could not create the account. Check the details and try again." };
  }
  if (!data.session) {
    // Email confirmation is on: the workspace is created after the user confirms.
    return { message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish setting up ${companyName}.` };
  }
  const { data: companyId, error: rpcError } = await supabase.rpc("create_company", { company_name: companyName });
  if (rpcError) redirect("/onboarding");
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, String(companyId), { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    (await cookies()).delete(ACTIVE_COMPANY_COOKIE);
  }
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Same answer whether or not the account exists (prevents email discovery).
  return { message: "If an account exists for that email, a reset link is on its way. It expires in 1 hour." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "This reset link has expired. Request a new one." };
  redirect("/dashboard");
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = z.object({ companyName: z.string().trim().min(2, "Enter your buying house name.").max(120) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company", { company_name: parsed.data.companyName });
  if (error) return { error: error.message.includes("limit") ? "You have reached the workspace limit." : "Could not create the workspace. Try again." };
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, String(data), { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  redirect("/dashboard");
}
