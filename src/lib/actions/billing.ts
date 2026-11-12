"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { actionContext, zodFail } from "./guard";
import { DEMO_MESSAGE, type ActionResult } from "./types";

const paymentSchema = z.object({
  plan: z.enum(["starter", "business"]),
  senderNumber: z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter the 11-digit bKash number you paid from."),
  trxId: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,12}$/, "Enter the transaction ID from the bKash message (8–12 letters and numbers)."),
});

/**
 * Records that a Company Admin says they paid by bKash. Nothing is activated
 * here: a platform admin must match the transaction against the bKash statement.
 */
export async function submitPayment(input: z.input<typeof paymentSchema>): Promise<ActionResult> {
  const guard = await actionContext(["company_admin"]);
  if ("fail" in guard) return guard.fail;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { ctx } = guard;
  const { error } = await ctx.supabase.rpc("submit_payment_request", {
    cid: ctx.companyId,
    plan_key: parsed.data.plan,
    sender: parsed.data.senderNumber,
    trx: parsed.data.trxId,
  });
  if (error) {
    const m = error.message;
    if (m.includes("duplicate key")) return { ok: false, error: "This transaction ID was already submitted.", fieldErrors: { trxId: "Already submitted." } };
    if (m.includes("already waiting")) return { ok: false, error: "You already have payments waiting for verification. We will review them first." };
    if (m.includes("Company Admin")) return { ok: false, error: "Only a Company Admin can submit a payment." };
    return { ok: false, error: "The payment could not be recorded. Nothing was changed; please try again." };
  }
  revalidatePath("/office/billing");
  return { ok: true, message: "Payment submitted. Your plan changes after we verify it, usually within one working day." };
}

const reviewSchema = z.object({ id: z.uuid(), approve: z.boolean(), note: z.string().trim().max(300) });

/** Platform admins only — the database function refuses everyone else. */
export async function reviewPayment(input: z.infer<typeof reviewSchema>): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: DEMO_MESSAGE };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the review details." };
  if (!parsed.data.approve && !parsed.data.note) return { ok: false, error: "Add a short reason so the company knows why it was rejected." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_payment", { request_id: parsed.data.id, approve: parsed.data.approve, note: parsed.data.note });
  if (error) {
    if (error.message.includes("platform admins")) return { ok: false, error: "Only platform admins can review payments." };
    if (error.message.includes("already reviewed")) return { ok: false, error: "This payment was already reviewed." };
    return { ok: false, error: "The review could not be saved." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: parsed.data.approve ? "Payment approved and plan activated." : "Payment rejected." };
}
