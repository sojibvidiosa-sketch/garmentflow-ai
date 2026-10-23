import { daysBetween } from "@/lib/utils";
import type { Milestone, PurchaseOrder } from "./types";

/**
 * Deterministic deadline rules. These never call AI: overdue/upcoming is a
 * plain date comparison against `today` (a YYYY-MM-DD string), which the
 * caller supplies so the same logic is testable and usable from the
 * scheduled job in Phase 6.
 */

export const UPCOMING_WINDOW_DAYS = 7;
export const REVIEW_STALE_DAYS = 2;

export type DeadlineState = "done" | "overdue" | "due_soon" | "upcoming" | "blocked";

export function deadlineState(m: Pick<Milestone, "status" | "plannedDate">, today: string): DeadlineState {
  if (m.status === "completed") return "done";
  if (m.status === "blocked") return "blocked";
  const days = daysBetween(today, m.plannedDate);
  if (days < 0) return "overdue";
  if (days <= UPCOMING_WINDOW_DAYS) return "due_soon";
  return "upcoming";
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  kind: "milestone_overdue" | "milestone_due_soon" | "milestone_blocked" | "po_review_pending";
  severity: AlertSeverity;
  poId: string;
  milestoneId: string | null;
  responsibleId: string | null;
  /** Calendar day the rule refers to (planned date, or PO creation day). */
  date: string;
  /** Positive = days overdue / waiting, negative = days remaining. */
  days: number;
}

export function computeAlerts(orders: PurchaseOrder[], milestones: Milestone[], today: string): Alert[] {
  const alerts: Alert[] = [];
  const activeOrders = new Map(
    orders.filter((o) => o.status !== "shipped" && o.status !== "cancelled").map((o) => [o.id, o]),
  );

  for (const m of milestones) {
    const po = activeOrders.get(m.poId);
    if (!po) continue;
    const state = deadlineState(m, today);
    const overdueBy = daysBetween(m.plannedDate, today);
    const base = { poId: po.id, milestoneId: m.id, responsibleId: m.assigneeId ?? po.merchandiserId, date: m.plannedDate };

    if (state === "overdue") {
      // Escalate to critical after 3 days or for the shipment milestone itself.
      const severity: AlertSeverity = overdueBy > 3 || m.key === "shipment" ? "critical" : "warning";
      alerts.push({ ...base, id: `overdue:${m.id}`, kind: "milestone_overdue", severity, days: overdueBy });
    } else if (state === "due_soon") {
      alerts.push({ ...base, id: `soon:${m.id}`, kind: "milestone_due_soon", severity: "info", days: overdueBy });
    } else if (state === "blocked") {
      alerts.push({ ...base, id: `blocked:${m.id}`, kind: "milestone_blocked", severity: "warning", days: overdueBy });
    }
  }

  for (const po of activeOrders.values()) {
    if (po.status !== "pending_review") continue;
    const waiting = daysBetween(po.createdAt, today);
    if (waiting >= REVIEW_STALE_DAYS) {
      alerts.push({
        id: `review:${po.id}`,
        kind: "po_review_pending",
        severity: "warning",
        poId: po.id,
        milestoneId: null,
        responsibleId: po.merchandiserId,
        date: po.createdAt.slice(0, 10),
        days: waiting,
      });
    }
  }

  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || b.days - a.days);
}

export function totalQuantity(po: Pick<PurchaseOrder, "items">): number {
  return po.items.reduce(
    (sum, item) => sum + item.colors.reduce((s, c) => s + c.sizes.reduce((t, size) => t + size.qty, 0), 0),
    0,
  );
}
