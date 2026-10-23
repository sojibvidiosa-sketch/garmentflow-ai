"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MESSAGE, type ActionResult } from "./types";

const subSchema = z.object({
  companyId: z.uuid(),
  plan: z.enum(["pilot", "starter", "business", "enterprise"]),
  status: z.enum(["trialing", "active", "past_due", "cancelled"]),
  seatLimit: z.number().int().min(1).max(1000),
  poLimit: z.number().int().min(1).max(100000),
  aiJobLimit: z.number().int().min(0).max(100000),
});

/** Platform admins only — the database function refuses everyone else. */
export async function updateSubscription(input: z.infer<typeof subSchema>): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: DEMO_MESSAGE };
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the plan values." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_subscription", {
    cid: v.companyId,
    new_plan: v.plan,
    new_status: v.status,
    seats: v.seatLimit,
    pos: v.poLimit,
    ai_jobs: v.aiJobLimit,
  });
  if (error) return { ok: false, error: error.message.includes("platform admins") ? "Only platform admins can change plans." : "The plan could not be updated." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Plan updated." };
}
