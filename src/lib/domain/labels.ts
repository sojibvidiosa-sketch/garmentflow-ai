import type { MilestoneKey, MilestoneStatus, PoStatus, Priority, Role } from "./types";

export type Tone = "neutral" | "violet" | "green" | "yellow" | "red" | "blue";

/** Default garment T&A template, in execution order. */
export const MILESTONE_ORDER: MilestoneKey[] = [
  "fit_sample",
  "lab_dip",
  "fabric_booking",
  "fabric_inhouse",
  "pp_sample",
  "production_start",
  "inline_inspection",
  "final_inspection",
  "shipment",
];

export const MILESTONE_LABEL: Record<MilestoneKey, string> = {
  fit_sample: "Fit Sample Approval",
  lab_dip: "Lab Dip Approval",
  fabric_booking: "Fabric Booking",
  fabric_inhouse: "Fabric In-house",
  pp_sample: "PP Sample Approval",
  production_start: "Production Start",
  inline_inspection: "Inline Inspection",
  final_inspection: "Final Inspection",
  shipment: "Shipment",
};

export const MILESTONE_SHORT: Record<MilestoneKey, string> = {
  fit_sample: "Fit",
  lab_dip: "Lab dip",
  fabric_booking: "Fab. book",
  fabric_inhouse: "Fab. in",
  pp_sample: "PP",
  production_start: "Prod.",
  inline_inspection: "Inline",
  final_inspection: "Final",
  shipment: "Ship",
};

export const PO_STATUS: Record<PoStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Pending review", tone: "yellow" },
  confirmed: { label: "Confirmed", tone: "violet" },
  in_production: { label: "In production", tone: "blue" },
  shipped: { label: "Shipped", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export const MILESTONE_STATUS: Record<MilestoneStatus, { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
  blocked: { label: "Blocked", tone: "red" },
};

export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "High", tone: "red" },
};

export const ROLE_LABEL: Record<Role, string> = {
  company_admin: "Company Admin",
  merch_manager: "Merchandising Manager",
  merchandiser: "Merchandiser",
  viewer: "Viewer",
};
