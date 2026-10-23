/**
 * Domain types. Field names mirror the planned Supabase tables
 * (see docs/ARCHITECTURE.md §D) so the Phase 2 switch from demo data to the
 * database does not require reshaping UI code.
 */

export type Role = "company_admin" | "merch_manager" | "merchandiser" | "viewer";

export type PoStatus = "draft" | "pending_review" | "confirmed" | "in_production" | "shipped" | "cancelled";

export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked";

export type MilestoneKey =
  | "fit_sample"
  | "lab_dip"
  | "fabric_booking"
  | "fabric_inhouse"
  | "pp_sample"
  | "production_start"
  | "inline_inspection"
  | "final_inspection"
  | "shipment";

export type Priority = "low" | "normal" | "high";

export interface Member {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface Buyer {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
}

export interface SizeQty {
  size: string;
  qty: number;
}

export interface ColorBreakdown {
  color: string;
  sizes: SizeQty[];
}

export interface PoItem {
  id: string;
  styleNo: string;
  description: string;
  fabric: string;
  gsm: number | null;
  colors: ColorBreakdown[];
}

export interface Milestone {
  id: string;
  poId: string;
  key: MilestoneKey;
  plannedDate: string;
  actualDate: string | null;
  status: MilestoneStatus;
  assigneeId: string | null;
  priority: Priority;
  notes: string;
}

export interface PoDocument {
  id: string;
  poId: string | null;
  fileName: string;
  kind: "purchase_order" | "tech_pack" | "buyer_email" | "other";
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ActivityEntry {
  id: string;
  poId: string | null;
  actorId: string;
  action: string;
  at: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  buyerId: string;
  season: string;
  status: PoStatus;
  shipDate: string;
  orderDate: string;
  merchandiserId: string;
  currency: "USD" | "EUR" | "GBP";
  unitPrice: number | null;
  notes: string;
  specialInstructions: string;
  items: PoItem[];
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  plan: "pilot" | "starter" | "business";
  subscription: "trialing" | "active" | "past_due" | "cancelled";
  activeUsers: number;
  activePos: number;
  aiJobs30d: number;
  aiCost30dUsd: number;
  createdAt: string;
}

export interface AiJob {
  id: string;
  companyId: string;
  kind: "extraction" | "email_draft" | "report_summary";
  status: "queued" | "processing" | "succeeded" | "failed";
  error: string | null;
  tokens: number;
  costUsd: number;
  createdAt: string;
}

export interface Task {
  id: string;
  poId: string | null;
  title: string;
  assigneeId: string | null;
  dueDate: string | null;
  doneAt: string | null;
  createdAt: string;
}
