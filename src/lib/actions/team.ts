"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACTIVE_COMPANY_COOKIE, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { actionContext, dbFail, zodFail } from "./guard";
import { DEMO_MESSAGE, type ActionResult } from "./types";

const ADMIN = ["company_admin"] as const;
const roleEnum = z.enum(["company_admin", "merch_manager", "merchandiser", "viewer"]);

export async function inviteMember(input: { email: string; role: string }): Promise<ActionResult> {
  const guard = await actionContext([...ADMIN]);
  if ("fail" in guard) return guard.fail;
  const parsed = z.object({ email: z.email("Enter a valid email address.").transform((e) => e.trim().toLowerCase()), role: roleEnum }).safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase, companyId, userId } = guard.ctx;
  const { error } = await supabase
    .from("invitations")
    .upsert({ company_id: companyId, email: parsed.data.email, role: parsed.data.role, invited_by: userId, accepted_at: null, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }, { onConflict: "company_id,email" });
  if (error) return dbFail(error.message, "The invitation could not be created.");
  revalidatePath("/team");
  return { ok: true, message: `Invitation ready. Ask ${parsed.data.email} to create an account (or sign in) with that email. They will see the invitation and can join. It expires in 7 days.` };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const guard = await actionContext([...ADMIN]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown invitation." };
  const { error } = await guard.ctx.supabase.from("invitations").delete().eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error) return dbFail(error.message, "The invitation could not be revoked.");
  revalidatePath("/team");
  return { ok: true, message: "Invitation revoked." };
}

export async function updateMember(input: { userId: string; role: string; status: "active" | "suspended" }): Promise<ActionResult> {
  const guard = await actionContext([...ADMIN]);
  if ("fail" in guard) return guard.fail;
  const parsed = z.object({ userId: z.uuid(), role: roleEnum, status: z.enum(["active", "suspended"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid change." };
  const { error, count } = await guard.ctx.supabase
    .from("company_memberships")
    .update({ role: parsed.data.role, status: parsed.data.status }, { count: "exact" })
    .eq("company_id", guard.ctx.companyId)
    .eq("user_id", parsed.data.userId);
  if (error || !count) return dbFail(error?.message, "The member could not be updated.");
  revalidatePath("/team");
  return { ok: true, message: "Member updated." };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const guard = await actionContext([...ADMIN]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "Unknown member." };
  const { error, count } = await guard.ctx.supabase.from("company_memberships").delete({ count: "exact" }).eq("company_id", guard.ctx.companyId).eq("user_id", userId);
  if (error || !count) return dbFail(error?.message, "The member could not be removed.");
  revalidatePath("/team");
  return { ok: true, message: "Member removed from this workspace." };
}

/** Joins a company the signed-in user was invited to (works before they belong to any company). */
export async function acceptInvitation(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: DEMO_MESSAGE };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown invitation." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { invitation_id: id });
  if (error) return dbFail(error.message.includes("seat limit") ? "seat limit reached" : error.message, "This invitation is no longer valid. Ask the admin to invite you again.");
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, String(data), { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  revalidatePath("/", "layout");
  return { ok: true, message: "You joined the workspace." };
}

/** Switches the active workspace for users who belong to several companies. */
export async function switchCompany(companyId: string): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(companyId).success) return { ok: false, error: "Unknown workspace." };
  const { data } = await guard.ctx.supabase.from("company_memberships").select("company_id").eq("user_id", guard.ctx.userId).eq("company_id", companyId).eq("status", "active").maybeSingle();
  if (!data) return { ok: false, error: "You are not a member of that workspace." };
  (await cookies()).set(ACTIVE_COMPANY_COOKIE, companyId, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCompanyName(name: string): Promise<ActionResult> {
  const guard = await actionContext([...ADMIN]);
  if ("fail" in guard) return guard.fail;
  const parsed = z.string().trim().min(2, "Enter at least 2 characters.").max(120).safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const { error } = await guard.ctx.supabase.from("companies").update({ name: parsed.data }).eq("id", guard.ctx.companyId);
  if (error) return dbFail(error.message, "The company name could not be saved.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Company name updated." };
}

export async function updateProfile(fullName: string): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  const parsed = z.string().trim().min(2, "Enter your full name.").max(120).safeParse(fullName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const { supabase, userId } = guard.ctx;
  const [{ error }] = await Promise.all([
    supabase.from("profiles").update({ full_name: parsed.data }).eq("id", userId),
    supabase.auth.updateUser({ data: { full_name: parsed.data } }),
  ]);
  if (error) return dbFail(error.message, "Your name could not be saved.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

export async function changePassword(input: { password: string; confirm: string }): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  const parsed = z
    .object({ password: z.string().min(8, "Use at least 8 characters.").max(72), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
    .safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await guard.ctx.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.code === "same_password" ? "Choose a password different from the current one." : "The password could not be changed. Sign in again and retry." };
  return { ok: true, message: "Password changed." };
}
