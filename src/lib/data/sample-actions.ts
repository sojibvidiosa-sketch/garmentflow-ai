"use server";

import { revalidatePath } from "next/cache";
import * as demo from "@/lib/demo/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { addDays, daysBetween } from "@/lib/utils";
import { getContext } from "./supabase";

export interface SampleState {
  error?: string;
  done?: boolean;
}

/**
 * Copies the fictional sample dataset into the caller's own (empty)
 * workspace so a new pilot company can try every screen. Runs as the user,
 * so RLS applies to every insert. Dates are shifted to start from today.
 */
export async function loadSampleData(): Promise<SampleState> {
  if (!isSupabaseConfigured) return { error: "Not available in demo mode." };
  const ctx = await getContext();
  const { supabase, companyId, userId } = ctx;

  const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  if (count) return { error: "Sample data can only be loaded into an empty workspace." };

  const shift = daysBetween(demo.DEMO_TODAY, ctx.today);
  const move = (d: string | null) => (d ? addDays(d, shift) : null);

  const { data: buyers, error: buyerError } = await supabase
    .from("buyers")
    .insert(demo.buyers.map((b) => ({ company_id: companyId, name: `${b.name} (sample)`, country: b.country, contact_email: b.contactEmail })))
    .select("id, name");
  if (buyerError) return { error: "Could not add sample buyers." };
  const buyerId = new Map(demo.buyers.map((b) => [b.id, buyers.find((x) => x.name === `${b.name} (sample)`)?.id]));

  for (const po of demo.purchaseOrders) {
    const { data: created, error } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: companyId,
        po_number: `${po.poNumber}-S`,
        buyer_id: buyerId.get(po.buyerId) ?? null,
        season: po.season,
        status: po.status,
        order_date: move(po.orderDate),
        ship_date: move(po.shipDate),
        currency: po.currency,
        unit_price: po.unitPrice,
        merchandiser_id: userId,
        notes: po.notes,
        special_instructions: po.specialInstructions,
      })
      .select("id")
      .single();
    if (error) return { error: `Could not add sample order ${po.poNumber}.` };

    await supabase.from("po_items").insert(
      po.items.map((item, position) => ({
        company_id: companyId,
        po_id: created.id,
        style_no: item.styleNo,
        description: item.description,
        fabric: item.fabric,
        gsm: item.gsm,
        colors: item.colors,
        position,
      })),
    );
    const ms = demo.milestones.filter((m) => m.poId === po.id);
    if (ms.length) {
      await supabase.from("milestones").insert(
        ms.map((m) => ({
          company_id: companyId,
          po_id: created.id,
          key: m.key,
          planned_date: move(m.plannedDate),
          actual_date: move(m.actualDate),
          status: m.status,
          assignee_id: userId,
          priority: m.priority,
          notes: m.notes,
        })),
      );
    }
  }

  revalidatePath("/", "layout");
  return { done: true };
}
