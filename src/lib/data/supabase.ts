import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { computeAlerts, totalQuantity } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, PO_STATUS } from "@/lib/domain/labels";
import type { ActivityEntry, Buyer, ColorBreakdown, Member, Milestone, PoDocument, PurchaseOrder, Role, Task } from "@/lib/domain/types";
import type { PoRow } from "./index";

/** Calendar day in Bangladesh — deadline rules are evaluated per local day. */
export function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

/**
 * Resolves the signed-in user and their active company once per request.
 * Signed-out users go to /login; users without a company go to /onboarding.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("company_memberships")
    .select("company_id, role, companies(name)")
    .eq("user_id", auth.user.id)
    .eq("status", "active");
  if (!memberships?.length) redirect("/onboarding");

  const wanted = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const active = memberships.find((m) => m.company_id === wanted) ?? memberships[0]!;
  const company = active.companies as unknown as { name: string } | null;

  return {
    supabase,
    userId: auth.user.id,
    email: auth.user.email ?? "",
    fullName: (auth.user.user_metadata?.full_name as string | undefined) ?? auth.user.email ?? "",
    companyId: active.company_id as string,
    companyName: company?.name ?? "Workspace",
    role: active.role as Role,
    today: dhakaToday(),
  };
});

type Ctx = Awaited<ReturnType<typeof getContext>>;

interface PoRecord {
  id: string;
  po_number: string;
  buyer_id: string | null;
  season: string;
  status: PurchaseOrder["status"];
  order_date: string | null;
  ship_date: string | null;
  currency: PurchaseOrder["currency"];
  unit_price: number | string | null;
  merchandiser_id: string | null;
  notes: string;
  special_instructions: string;
  created_at: string;
  po_items: { id: string; style_no: string; description: string; fabric: string; gsm: number | null; colors: ColorBreakdown[]; position: number }[];
}

const PO_SELECT = "id, po_number, buyer_id, season, status, order_date, ship_date, currency, unit_price, merchandiser_id, notes, special_instructions, created_at, po_items(id, style_no, description, fabric, gsm, colors, position)";

function toPurchaseOrder(r: PoRecord): PurchaseOrder {
  return {
    id: r.id,
    poNumber: r.po_number,
    buyerId: r.buyer_id ?? "",
    season: r.season,
    status: r.status,
    shipDate: r.ship_date ?? "",
    orderDate: r.order_date ?? "",
    merchandiserId: r.merchandiser_id ?? "",
    currency: r.currency,
    unitPrice: r.unit_price === null ? null : Number(r.unit_price),
    notes: r.notes,
    specialInstructions: r.special_instructions,
    createdAt: r.created_at,
    items: [...r.po_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, styleNo: i.style_no, description: i.description, fabric: i.fabric, gsm: i.gsm, colors: i.colors ?? [] })),
  };
}

interface MilestoneRecord {
  id: string;
  po_id: string;
  key: Milestone["key"];
  planned_date: string;
  actual_date: string | null;
  status: Milestone["status"];
  assignee_id: string | null;
  priority: Milestone["priority"];
  notes: string;
}

function toMilestone(r: MilestoneRecord): Milestone {
  return { id: r.id, poId: r.po_id, key: r.key, plannedDate: r.planned_date, actualDate: r.actual_date, status: r.status, assigneeId: r.assignee_id, priority: r.priority, notes: r.notes };
}

async function fetchOrders(ctx: Ctx): Promise<PurchaseOrder[]> {
  const { data, error } = await ctx.supabase.from("purchase_orders").select(PO_SELECT).eq("company_id", ctx.companyId).order("ship_date", { ascending: true }).limit(1000);
  if (error) throw new Error(`Could not load purchase orders: ${error.message}`);
  return (data as unknown as PoRecord[]).map(toPurchaseOrder);
}

async function fetchMilestones(ctx: Ctx): Promise<Milestone[]> {
  const { data, error } = await ctx.supabase
    .from("milestones")
    .select("id, po_id, key, planned_date, actual_date, status, assignee_id, priority, notes")
    .eq("company_id", ctx.companyId)
    .limit(10000);
  if (error) throw new Error(`Could not load milestones: ${error.message}`);
  return (data as MilestoneRecord[]).map(toMilestone);
}

export async function listBuyers(): Promise<Buyer[]> {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.from("buyers").select("id, name, country, contact_email").eq("company_id", ctx.companyId).order("name");
  if (error) throw new Error(`Could not load buyers: ${error.message}`);
  return data.map((b) => ({ id: b.id, name: b.name, country: b.country, contactEmail: b.contact_email }));
}

export async function listMembers(): Promise<Member[]> {
  const ctx = await getContext();
  const { data: rows, error } = await ctx.supabase.from("company_memberships").select("user_id, role").eq("company_id", ctx.companyId);
  if (error) throw new Error(`Could not load team: ${error.message}`);
  const { data: profiles } = await ctx.supabase.from("profiles").select("id, full_name, email").in("id", rows.map((r) => r.user_id));
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.user_id);
    return { id: r.user_id, fullName: p?.full_name || p?.email || "Team member", email: p?.email ?? "", role: r.role as Role };
  });
}

export async function getWorkspace() {
  const ctx = await getContext();
  return {
    companyName: ctx.companyName,
    user: { id: ctx.userId, fullName: ctx.fullName, email: ctx.email, role: ctx.role } satisfies Member,
    today: ctx.today,
    source: "live" as const,
  };
}

export async function listPurchaseOrders(): Promise<PoRow[]> {
  const ctx = await getContext();
  const [orders, buyers, members] = await Promise.all([fetchOrders(ctx), listBuyers(), listMembers()]);
  const buyer = new Map(buyers.map((b) => [b.id, b.name]));
  const member = new Map(members.map((m) => [m.id, m.fullName]));
  return orders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    buyerName: buyer.get(po.buyerId) ?? "—",
    styleNo: po.items.map((i) => i.styleNo).join(", "),
    description: po.items[0]?.description ?? "",
    quantity: totalQuantity(po),
    shipDate: po.shipDate,
    status: po.status,
    merchandiser: member.get(po.merchandiserId) ?? "Unassigned",
  }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPurchaseOrder(id: string) {
  if (!UUID.test(id)) return null;
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.from("purchase_orders").select(PO_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null; // RLS hides other companies' orders: same as not found.
  const po = toPurchaseOrder(data as unknown as PoRecord);
  const [buyers, members, ms, docs, activity] = await Promise.all([
    listBuyers(),
    listMembers(),
    ctx.supabase.from("milestones").select("id, po_id, key, planned_date, actual_date, status, assignee_id, priority, notes").eq("po_id", id),
    ctx.supabase.from("documents").select("id, po_id, file_name, kind, size_bytes, created_at, uploaded_by").eq("po_id", id),
    listActivity(id),
  ]);
  return {
    po,
    buyer: buyers.find((b) => b.id === po.buyerId) ?? null,
    merchandiser: members.find((m) => m.id === po.merchandiserId) ?? null,
    milestones: ((ms.data ?? []) as MilestoneRecord[]).map(toMilestone),
    documents: (docs.data ?? []).map(
      (d): PoDocument => ({ id: d.id, poId: d.po_id, fileName: d.file_name, kind: d.kind, sizeBytes: d.size_bytes, uploadedAt: d.created_at, uploadedBy: d.uploaded_by ?? "" }),
    ),
    activity,
    quantity: totalQuantity(po),
  };
}

export async function listMilestones(): Promise<Milestone[]> {
  return fetchMilestones(await getContext());
}

export async function listAlerts() {
  const ctx = await getContext();
  const [orders, milestones] = await Promise.all([fetchOrders(ctx), fetchMilestones(ctx)]);
  return computeAlerts(orders, milestones, ctx.today);
}

function describe(action: string, target: string, meta: Record<string, { to?: unknown }>, key?: string): string {
  const thing = target === "purchase_orders" ? "purchase order" : key ? MILESTONE_LABEL[key as Milestone["key"]] ?? "milestone" : "a milestone";
  if (action === "insert") return `created ${thing}`;
  if (meta.status?.to) {
    const to = String(meta.status.to);
    const label = target === "purchase_orders" ? PO_STATUS[to as PurchaseOrder["status"]]?.label : to.replace("_", " ");
    return target === "milestones" && to === "completed" ? `marked ${thing} as completed` : `changed ${thing} status to ${label ?? to}`;
  }
  const fields = Object.keys(meta).map((f) => f.replace(/_/g, " "));
  return `updated ${fields.slice(0, 2).join(" and ") || "details"} on ${thing}`;
}

export async function listActivity(poId?: string): Promise<ActivityEntry[]> {
  const ctx = await getContext();
  let q = ctx.supabase.from("audit_logs").select("id, po_id, actor_id, action, target_type, target_id, meta, created_at").eq("company_id", ctx.companyId).in("target_type", ["purchase_orders", "milestones"]);
  if (poId) q = q.eq("po_id", poId);
  const { data } = await q.order("created_at", { ascending: false }).limit(30);
  const rows = data ?? [];
  const msIds = rows.filter((r) => r.target_type === "milestones" && r.target_id).map((r) => r.target_id as string);
  const keys = new Map<string, string>();
  if (msIds.length) {
    const { data: ms } = await ctx.supabase.from("milestones").select("id, key").in("id", msIds);
    (ms ?? []).forEach((m) => keys.set(m.id, m.key));
  }
  return rows.map((r) => ({
    id: String(r.id),
    poId: r.po_id,
    actorId: r.actor_id ?? "",
    action: describe(r.action, r.target_type, (r.meta ?? {}) as Record<string, { to?: unknown }>, keys.get(r.target_id ?? "")),
    at: r.created_at,
  }));
}

export async function getReportData() {
  const ctx = await getContext();
  const [orders, milestones, buyers, members, activity] = await Promise.all([fetchOrders(ctx), fetchMilestones(ctx), listBuyers(), listMembers(), listActivity()]);
  return { orders, milestones, buyers, members, activity, today: ctx.today };
}

/** A stored AI extraction, ready for the review screen. */
export async function getExtraction(jobId: string) {
  if (!UUID.test(jobId)) return null;
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("extraction_results").select("status, raw, document_id, po_id").eq("ai_job_id", jobId).maybeSingle();
  if (!data) return null;
  const { parseExtraction, toReviewFields } = await import("@/lib/ai/extraction");
  const raw = data.raw as { reply: unknown; file_name?: string; source_text?: string };
  let documentUrl: string | null = null;
  if (data.document_id) {
    const { data: doc } = await ctx.supabase.from("documents").select("storage_path").eq("id", data.document_id).maybeSingle();
    if (doc) documentUrl = (await ctx.supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60 * 30)).data?.signedUrl ?? null;
  }
  return {
    status: data.status as "needs_review" | "approved" | "rejected",
    poId: data.po_id as string | null,
    extraction: toReviewFields(parseExtraction(raw.reply), { fileName: raw.file_name ?? "Document", sourceText: raw.source_text ?? "", documentUrl }),
  };
}

export interface DocumentRow {
  id: string;
  fileName: string;
  kind: PoDocument["kind"];
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  poId: string | null;
  poNumber: string | null;
  extraction: { jobId: string; status: "needs_review" | "approved" | "rejected" } | null;
  lastJobFailed: string | null;
}

export async function listDocuments(): Promise<DocumentRow[]> {
  const ctx = await getContext();
  const [{ data: docs }, members, { data: results }, { data: jobs }] = await Promise.all([
    ctx.supabase.from("documents").select("id, file_name, kind, size_bytes, created_at, uploaded_by, po_id, purchase_orders(po_number)").eq("company_id", ctx.companyId).order("created_at", { ascending: false }).limit(500),
    listMembers(),
    ctx.supabase.from("extraction_results").select("ai_job_id, document_id, status, created_at").eq("company_id", ctx.companyId).order("created_at", { ascending: false }),
    ctx.supabase.from("ai_jobs").select("document_id, status, error, created_at").eq("company_id", ctx.companyId).eq("kind", "extraction").order("created_at", { ascending: false }).limit(500),
  ]);
  const name = new Map(members.map((m) => [m.id, m.fullName]));
  return (docs ?? []).map((d) => {
    const ex = results?.find((r) => r.document_id === d.id);
    const job = jobs?.find((j) => j.document_id === d.id);
    return {
      id: d.id,
      fileName: d.file_name,
      kind: d.kind,
      sizeBytes: d.size_bytes,
      uploadedAt: d.created_at,
      uploadedBy: name.get(d.uploaded_by ?? "") ?? "Team member",
      poId: d.po_id,
      poNumber: (d.purchase_orders as unknown as { po_number: string } | null)?.po_number ?? null,
      extraction: ex ? { jobId: ex.ai_job_id, status: ex.status } : null,
      lastJobFailed: job?.status === "failed" ? "AI could not read this file last time." : null,
    };
  });
}

export async function listTasks(): Promise<Task[]> {
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("tasks").select("id, po_id, title, assignee_id, due_date, done_at, created_at").eq("company_id", ctx.companyId).order("created_at", { ascending: false }).limit(500);
  return (data ?? []).map((t) => ({ id: t.id, poId: t.po_id, title: t.title, assigneeId: t.assignee_id, dueDate: t.due_date, doneAt: t.done_at, createdAt: t.created_at }));
}

export async function listAlertReads(): Promise<string[]> {
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("alert_reads").select("alert_id").eq("user_id", ctx.userId).eq("company_id", ctx.companyId).limit(5000);
  return (data ?? []).map((r) => r.alert_id);
}

export interface EmailDraftRow {
  id: string;
  poId: string | null;
  purpose: string;
  recipient: string;
  tone: string;
  subject: string;
  body: string;
  aiJobId: string | null;
  updatedAt: string;
}

export async function listEmailDrafts(): Promise<EmailDraftRow[]> {
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("email_drafts")
    .select("id, po_id, purpose, recipient_type, tone, subject, body, ai_job_id, updated_at")
    .eq("company_id", ctx.companyId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((d) => ({ id: d.id, poId: d.po_id, purpose: d.purpose, recipient: d.recipient_type, tone: d.tone, subject: d.subject, body: d.body, aiJobId: d.ai_job_id, updatedAt: d.updated_at }));
}

export interface TeamData {
  members: { id: string; fullName: string; email: string; role: Role; status: "active" | "suspended"; joinedAt: string }[];
  invitations: { id: string; email: string; role: Role; expiresAt: string; createdAt: string }[];
}

export async function getTeam(): Promise<TeamData> {
  const ctx = await getContext();
  const [{ data: rows }, { data: invites }] = await Promise.all([
    ctx.supabase.from("company_memberships").select("user_id, role, status, created_at").eq("company_id", ctx.companyId).order("created_at"),
    ctx.supabase.from("invitations").select("id, email, role, expires_at, created_at").eq("company_id", ctx.companyId).is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: profiles } = ids.length ? await ctx.supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return {
    members: (rows ?? []).map((r) => ({
      id: r.user_id,
      fullName: byId.get(r.user_id)?.full_name || byId.get(r.user_id)?.email || "Team member",
      email: byId.get(r.user_id)?.email ?? "",
      role: r.role as Role,
      status: r.status as "active" | "suspended",
      joinedAt: r.created_at,
    })),
    invitations: (invites ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role as Role, expiresAt: i.expires_at, createdAt: i.created_at })),
  };
}

export interface CompanySettings {
  companyName: string;
  plan: string;
  status: string;
  seatLimit: number;
  poLimit: number;
  aiJobLimit: number;
  seatsUsed: number;
  activePos: number;
  aiJobsThisMonth: number;
  aiCostThisMonth: number;
  companies: { id: string; name: string }[];
  activeCompanyId: string;
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const ctx = await getContext();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [{ data: sub }, { count: seats }, { count: pos }, { data: jobs }, { data: mine }] = await Promise.all([
    ctx.supabase.from("subscriptions").select("plan, status, seat_limit, po_limit, ai_job_limit").eq("company_id", ctx.companyId).maybeSingle(),
    ctx.supabase.from("company_memberships").select("user_id", { count: "exact", head: true }).eq("company_id", ctx.companyId).eq("status", "active"),
    ctx.supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("company_id", ctx.companyId).not("status", "in", "(shipped,cancelled)"),
    ctx.supabase.from("ai_jobs").select("cost_usd").eq("company_id", ctx.companyId).gte("created_at", start.toISOString()),
    ctx.supabase.from("company_memberships").select("company_id, companies(name)").eq("user_id", ctx.userId).eq("status", "active"),
  ]);
  return {
    companyName: ctx.companyName,
    plan: sub?.plan ?? "pilot",
    status: sub?.status ?? "trialing",
    seatLimit: sub?.seat_limit ?? 5,
    poLimit: sub?.po_limit ?? 50,
    aiJobLimit: sub?.ai_job_limit ?? 300,
    seatsUsed: seats ?? 0,
    activePos: pos ?? 0,
    aiJobsThisMonth: jobs?.length ?? 0,
    aiCostThisMonth: (jobs ?? []).reduce((s, j) => s + Number(j.cost_usd), 0),
    companies: (mine ?? []).map((m) => ({ id: m.company_id, name: (m.companies as unknown as { name: string } | null)?.name ?? "Workspace" })),
    activeCompanyId: ctx.companyId,
  };
}
