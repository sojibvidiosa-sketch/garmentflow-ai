/**
 * Data access layer. Every page reads data through these functions only.
 *
 * - Demo mode (no Supabase keys): the fictional dataset in lib/demo.
 * - Live mode: Supabase queries as the signed-in user, scoped to their active
 *   company and enforced again by Row Level Security (lib/data/supabase.ts).
 */
import * as demo from "@/lib/demo/data";
import { computeAlerts, totalQuantity } from "@/lib/domain/deadlines";
import type { ActivityEntry, Buyer, Member, Milestone, PurchaseOrder } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const DATA_SOURCE: "demo" | "live" = isSupabaseConfigured ? "live" : "demo";

// Loaded lazily so demo mode (and unit tests) never import server-only code.
const live = () => import("./supabase");

/** The calendar day deadline rules are evaluated against. */
export async function getToday(): Promise<string> {
  if (isSupabaseConfigured) return (await live()).dhakaToday();
  return demo.DEMO_TODAY;
}

export async function getWorkspace() {
  if (isSupabaseConfigured) return (await live()).getWorkspace();
  const user = demo.members.find((m) => m.id === demo.CURRENT_USER_ID)!;
  return { companyName: demo.DEMO_COMPANY_NAME, user, today: demo.DEMO_TODAY, source: "demo" as const };
}

export async function listMembers(): Promise<Member[]> {
  if (isSupabaseConfigured) return (await live()).listMembers();
  return demo.members;
}

export async function listBuyers(): Promise<Buyer[]> {
  if (isSupabaseConfigured) return (await live()).listBuyers();
  return demo.buyers;
}

export interface PoRow {
  id: string;
  poNumber: string;
  buyerName: string;
  styleNo: string;
  description: string;
  quantity: number;
  shipDate: string;
  status: PurchaseOrder["status"];
  merchandiser: string;
}

function lookups() {
  return {
    buyer: new Map(demo.buyers.map((b) => [b.id, b])),
    member: new Map(demo.members.map((m) => [m.id, m])),
  };
}

export async function listPurchaseOrders(): Promise<PoRow[]> {
  if (isSupabaseConfigured) return (await live()).listPurchaseOrders();
  const { buyer, member } = lookups();
  return demo.purchaseOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    buyerName: buyer.get(po.buyerId)?.name ?? "Unknown buyer",
    styleNo: po.items.map((i) => i.styleNo).join(", "),
    description: po.items[0]?.description ?? "",
    quantity: totalQuantity(po),
    shipDate: po.shipDate,
    status: po.status,
    merchandiser: member.get(po.merchandiserId)?.fullName ?? "Unassigned",
  }));
}

export async function getPurchaseOrder(id: string) {
  if (isSupabaseConfigured) return (await live()).getPurchaseOrder(id);
  const po = demo.purchaseOrders.find((p) => p.id === id);
  if (!po) return null;
  const { buyer, member } = lookups();
  return {
    po,
    buyer: buyer.get(po.buyerId) ?? null,
    merchandiser: member.get(po.merchandiserId) ?? null,
    milestones: demo.milestones.filter((m) => m.poId === id),
    documents: demo.documents.filter((d) => d.poId === id),
    activity: demo.activity.filter((a) => a.poId === id),
    quantity: totalQuantity(po),
  };
}

export async function listMilestones(): Promise<Milestone[]> {
  if (isSupabaseConfigured) return (await live()).listMilestones();
  return demo.milestones;
}

export async function listAlerts() {
  if (isSupabaseConfigured) return (await live()).listAlerts();
  return computeAlerts(demo.purchaseOrders, demo.milestones, demo.DEMO_TODAY);
}

export async function listActivity(): Promise<ActivityEntry[]> {
  if (isSupabaseConfigured) return (await live()).listActivity();
  return demo.activity;
}

export async function getSampleExtraction() {
  return demo.sampleExtraction;
}

/** Cross-company aggregates for platform admins (live version: Phase 8). */
export async function getPlatformOverview() {
  if (isSupabaseConfigured) return { companies: [], jobs: [], available: false };
  return { companies: demo.companies, jobs: demo.aiJobs, available: true };
}

/** Raw tables, used by reports which aggregate across them. */
export async function getReportData() {
  if (isSupabaseConfigured) return (await live()).getReportData();
  return {
    orders: demo.purchaseOrders,
    milestones: demo.milestones,
    buyers: demo.buyers,
    members: demo.members,
    activity: demo.activity,
    today: demo.DEMO_TODAY,
  };
}
