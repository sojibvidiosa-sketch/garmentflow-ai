/**
 * Data access layer. Every page reads data through these functions only.
 *
 * - Demo mode (no Supabase keys): the fictional dataset in lib/demo.
 * - Live mode: Supabase queries as the signed-in user, scoped to their active
 *   company and enforced again by Row Level Security (lib/data/supabase.ts).
 */
import * as demo from "@/lib/demo/data";
import { computeAlerts, totalQuantity } from "@/lib/domain/deadlines";
import type { ActivityEntry, Buyer, Member, Milestone, PurchaseOrder, Task } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ReviewExtraction } from "@/lib/ai/extraction";
import type { AdminData } from "./admin-types";

export type { AdminCompany, AdminData, AdminJob, Lead } from "./admin-types";

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

/** The built-in sample shown on the review screen in demo mode. */
export async function getSampleExtraction(): Promise<ReviewExtraction> {
  return { ...demo.sampleExtraction, documentUrl: null, currency: "USD", extraItems: [] };
}

/** A stored AI extraction (live mode only). */
export async function getExtraction(jobId: string) {
  if (!isSupabaseConfigured) return null;
  return (await live()).getExtraction(jobId);
}

export type { DocumentRow } from "./supabase";

export async function listDocuments(): Promise<import("./supabase").DocumentRow[]> {
  if (isSupabaseConfigured) return (await live()).listDocuments();
  const member = new Map(demo.members.map((m) => [m.id, m.fullName]));
  const po = new Map(demo.purchaseOrders.map((p) => [p.id, p.poNumber]));
  return demo.documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    kind: d.kind,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt,
    uploadedBy: member.get(d.uploadedBy) ?? "Team member",
    poId: d.poId,
    poNumber: d.poId ? (po.get(d.poId) ?? null) : null,
    extraction: d.kind === "purchase_order" ? { jobId: "sample", status: "approved" as const } : null,
    lastJobFailed: null,
  }));
}

export async function listTasks(): Promise<Task[]> {
  if (isSupabaseConfigured) return (await live()).listTasks();
  return demo.tasks;
}

/** Alert ids the current user has marked as read (demo: none). */
export async function listAlertReads(): Promise<string[]> {
  if (isSupabaseConfigured) return (await live()).listAlertReads();
  return [];
}

export type { EmailDraftRow } from "./supabase";

export async function listEmailDrafts(): Promise<import("./supabase").EmailDraftRow[]> {
  if (isSupabaseConfigured) return (await live()).listEmailDrafts();
  return [];
}

export type { CompanySettings, TeamData } from "./supabase";

export async function getTeam(): Promise<import("./supabase").TeamData> {
  if (isSupabaseConfigured) return (await live()).getTeam();
  return {
    members: demo.members.map((m) => ({ ...m, status: "active" as const, joinedAt: "2026-06-02T08:00:00Z" })),
    invitations: [{ id: "inv-1", email: "nusrat@demo-sourcing.test", role: "merchandiser", expiresAt: "2026-10-28T08:00:00Z", createdAt: "2026-10-21T08:00:00Z" }],
  };
}

export async function getCompanySettings(): Promise<import("./supabase").CompanySettings> {
  if (isSupabaseConfigured) return (await live()).getCompanySettings();
  const c = demo.companies[0]!;
  return {
    companyName: demo.DEMO_COMPANY_NAME,
    plan: c.plan,
    status: c.subscription,
    seatLimit: 10,
    poLimit: 150,
    aiJobLimit: 300,
    seatsUsed: demo.members.length,
    activePos: demo.purchaseOrders.filter((o) => o.status !== "shipped" && o.status !== "cancelled").length,
    aiJobsThisMonth: c.aiJobs30d,
    aiCostThisMonth: c.aiCost30dUsd,
    companies: [{ id: c.id, name: demo.DEMO_COMPANY_NAME }],
    activeCompanyId: c.id,
  };
}

/** Cross-company aggregates for platform admins (metadata only). */
export async function getAdminData(): Promise<AdminData> {
  if (isSupabaseConfigured) return (await live()).getAdminData();
  const name = new Map(demo.companies.map((c) => [c.id, c.name]));
  const limits = { pilot: [10, 150, 300], starter: [3, 30, 100], business: [10, 150, 300] } as const;
  return {
    companies: demo.companies.map((c) => ({
      id: c.id, name: c.name, createdAt: `${c.createdAt}T08:00:00Z`, plan: c.plan, status: c.subscription,
      seatLimit: limits[c.plan][0], poLimit: limits[c.plan][1], aiJobLimit: limits[c.plan][2],
      members: c.activeUsers, activePos: c.activePos, aiJobs30d: c.aiJobs30d, aiCost30d: c.aiCost30dUsd,
      failedJobs30d: demo.aiJobs.filter((j) => j.companyId === c.id && j.status === "failed").length,
      lastActivity: "2026-10-23T05:40:00Z",
    })),
    jobs: demo.aiJobs.map((j) => ({
      id: j.id, companyName: name.get(j.companyId) ?? "", kind: j.kind, status: j.status, model: "gpt-4.1-mini", error: j.error,
      inputTokens: Math.round(j.tokens * 0.85), outputTokens: Math.round(j.tokens * 0.15), costUsd: j.costUsd, createdAt: j.createdAt,
    })),
    activity: [
      { companyName: "Padma Trade Links", action: "update", targetType: "milestones", createdAt: "2026-10-23T06:12:00Z" },
      { companyName: demo.DEMO_COMPANY_NAME, action: "insert", targetType: "purchase_orders", createdAt: "2026-10-22T08:35:00Z" },
      { companyName: "Meghna Buying House", action: "create", targetType: "companies", createdAt: "2026-09-14T04:00:00Z" },
      { companyName: "Karnaphuli Sourcing", action: "update", targetType: "subscriptions", createdAt: "2026-09-02T10:00:00Z" },
    ],
    leads: [
      { id: "l1", fullName: "Rina Das", email: "rina@example-buying.test", company: "Example Buying Co.", phone: "+880 1700-000000", teamSize: "3–10 users", message: "We manage 40 active POs for EU buyers.", createdAt: "2026-10-22T09:10:00Z" },
    ],
  };
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
