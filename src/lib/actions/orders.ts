"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { poSchema, PO_STATUSES, type PoInput } from "@/lib/validation/po";
import { actionContext, dbFail, zodFail } from "./guard";
import type { ActionResult } from "./types";

/** Creates or updates a purchase order with its styles in one transaction. */
export async function savePurchaseOrder(input: PoInput, options: { createPlan?: boolean } = {}): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = poSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { supabase, companyId } = guard.ctx;

  const { data: id, error } = await supabase.rpc("save_purchase_order", {
    p: {
      id: v.id ?? "",
      company_id: companyId,
      po_number: v.poNumber,
      buyer_id: v.buyerId,
      season: v.season,
      status: v.status,
      order_date: v.orderDate,
      ship_date: v.shipDate,
      currency: v.currency,
      unit_price: v.unitPrice === null ? "" : String(v.unitPrice),
      merchandiser_id: v.merchandiserId,
      notes: v.notes,
      special_instructions: v.specialInstructions,
      items: v.items.map((i) => ({ style_no: i.styleNo, description: i.description, fabric: i.fabric, gsm: i.gsm === null ? "" : String(i.gsm), colors: i.colors })),
    },
  });
  if (error) return dbFail(error.message, "The order could not be saved. Try again.");

  if (options.createPlan && !v.id) {
    const { error: planError } = await supabase.rpc("create_tna_plan", { order_id: id });
    if (planError) return { ok: true, data: String(id), message: "Order saved, but the T&A plan could not be created. Create it from the order page." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: String(id), message: v.id ? "Order updated." : "Order created." };
}

const statusSchema = z.object({ id: z.uuid(), status: z.enum(PO_STATUSES) });

export async function updatePoStatus(id: string, status: (typeof PO_STATUSES)[number]): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Unknown order or status." };
  const { error, count } = await guard.ctx.supabase
    .from("purchase_orders")
    .update({ status }, { count: "exact" })
    .eq("id", id)
    .eq("company_id", guard.ctx.companyId);
  if (error || !count) return dbFail(error?.message, "The status could not be changed.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Status updated." };
}

export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager"]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown order." };
  const { error, count } = await guard.ctx.supabase.from("purchase_orders").delete({ count: "exact" }).eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error || !count) return dbFail(error?.message, "The order could not be deleted.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Order deleted." };
}

export async function createTnaPlan(poId: string): Promise<ActionResult<number>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(poId).success) return { ok: false, error: "Unknown order." };
  const { data, error } = await guard.ctx.supabase.rpc("create_tna_plan", { order_id: poId });
  if (error) return dbFail(error.message, "The T&A plan could not be created.");
  revalidatePath("/", "layout");
  return { ok: true, data: Number(data), message: `${data} milestones added. Review the planned dates in the T&A tracker.` };
}
