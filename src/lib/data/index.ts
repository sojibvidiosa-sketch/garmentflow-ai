/**
 * Data access layer. Every page reads data through these functions only.
 *
 * Phase 1: returns the fictional demo dataset (DATA_SOURCE = "demo").
 * Phase 2: these bodies are replaced with Supabase queries scoped to the
 * signed-in user's company (enforced again by Row Level Security), so pages
 * and components do not need to change.
 */
import * as demo from "@/lib/demo/data";
import { computeAlerts, totalQuantity } from "@/lib/domain/deadlines";
import type { Buyer, Member, Milestone, PurchaseOrder } from "@/lib/domain/types";

export const DATA_SOURCE = "demo" as const;

/** The calendar day deadline rules are evaluated against. */
export function getToday(): string {
  return demo.DEMO_TODAY;
}

export async function getWorkspace() {
  const user = demo.members.find((m) => m.id === demo.CURRENT_USER_ID)!;
  return { companyName: demo.DEMO_COMPANY_NAME, user, today: getToday(), source: DATA_SOURCE };
}

export async function listMembers(): Promise<Member[]> {
  return demo.members;
}

export async function listBuyers(): Promise<Buyer[]> {
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
  return demo.milestones;
}

export async function listAlerts() {
  return computeAlerts(demo.purchaseOrders, demo.milestones, getToday());
}

export async function listActivity() {
  return demo.activity;
}

export async function getSampleExtraction() {
  return demo.sampleExtraction;
}

export async function getPlatformOverview() {
  return { companies: demo.companies, jobs: demo.aiJobs };
}

/** Raw tables, used by reports which aggregate across them. */
export async function getReportData() {
  return {
    orders: demo.purchaseOrders,
    milestones: demo.milestones,
    buyers: demo.buyers,
    members: demo.members,
    activity: demo.activity,
    today: getToday(),
  };
}
