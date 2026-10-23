"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buyerSchema, type BuyerInput } from "@/lib/validation/po";
import { actionContext, dbFail, zodFail } from "./guard";
import type { ActionResult } from "./types";

export async function saveBuyer(input: BuyerInput): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = buyerSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase, companyId } = guard.ctx;
  const row = { name: parsed.data.name, country: parsed.data.country, contact_email: parsed.data.contactEmail.toLowerCase() };

  const { data, error } = parsed.data.id
    ? await supabase.from("buyers").update(row).eq("id", parsed.data.id).eq("company_id", companyId).select("id").single()
    : await supabase.from("buyers").insert({ ...row, company_id: companyId }).select("id").single();
  if (error) return dbFail(error.message.includes("duplicate") ? "duplicate key" : error.message, "The buyer could not be saved.");
  revalidatePath("/", "layout");
  return { ok: true, data: data.id, message: parsed.data.id ? "Buyer updated." : "Buyer added." };
}

export async function deleteBuyer(id: string): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager"]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown buyer." };
  const { error, count } = await guard.ctx.supabase.from("buyers").delete({ count: "exact" }).eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error || !count) return dbFail(error?.message, "The buyer could not be deleted.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Buyer deleted. Their orders keep their data but no longer show a buyer." };
}
