/**
 * Management reports. Every number is calculated from stored records —
 * AI may later write a narrative around these figures but never computes them.
 */
import { deadlineState, totalQuantity } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, PO_STATUS } from "@/lib/domain/labels";
import type { Buyer, Member, Milestone, PurchaseOrder } from "@/lib/domain/types";
import { daysBetween } from "@/lib/utils";

export type ReportKey = "po_summary" | "pending_tasks" | "completed" | "overdue" | "upcoming_shipments" | "team";

export type Cell = string | number;
export interface Report {
  key: ReportKey;
  title: string;
  description: string;
  headers: string[];
  /** Columns rendered as dates (YYYY-MM-DD) in the UI. */
  dateColumns: number[];
  rows: Cell[][];
  summary: { label: string; value: Cell }[];
}

interface Input {
  orders: PurchaseOrder[];
  milestones: Milestone[];
  buyers: Buyer[];
  members: Member[];
  today: string;
}

export function buildReports({ orders, milestones, buyers, members, today }: Input): Report[] {
  const buyer = new Map(buyers.map((b) => [b.id, b.name]));
  const member = new Map(members.map((m) => [m.id, m.fullName]));
  const po = new Map(orders.map((o) => [o.id, o]));
  const isActive = (o: PurchaseOrder | undefined) => !!o && (o.status === "confirmed" || o.status === "in_production");
  const activeMs = milestones.filter((m) => isActive(po.get(m.poId)));
  const open = activeMs.filter((m) => m.status !== "completed");
  const overdue = open.filter((m) => deadlineState(m, today) === "overdue");
  const completed30 = milestones.filter((m) => m.status === "completed" && m.actualDate && daysBetween(m.actualDate, today) <= 30 && daysBetween(m.actualDate, today) >= 0);
  const byDate = (a: Milestone, b: Milestone) => a.plannedDate.localeCompare(b.plannedDate);
  const name = (id: string | null) => member.get(id ?? "") ?? "Unassigned";
  const poNo = (id: string) => po.get(id)?.poNumber ?? "";

  const upcomingShip = orders
    .filter((o) => isActive(o) && daysBetween(today, o.shipDate) >= 0 && daysBetween(today, o.shipDate) <= 60)
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate));

  const totalQty = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + totalQuantity(o), 0);

  return [
    {
      key: "po_summary",
      title: "PO Summary",
      description: "All purchase orders with quantity, ship date and T&A progress.",
      headers: ["PO number", "Buyer", "Style", "Quantity (pcs)", "Ship date", "Status", "Milestones done"],
      dateColumns: [4],
      rows: [...orders]
        .sort((a, b) => a.shipDate.localeCompare(b.shipDate))
        .map((o) => {
          const ms = milestones.filter((m) => m.poId === o.id);
          return [o.poNumber, buyer.get(o.buyerId) ?? "", o.items.map((i) => i.styleNo).join(", "), totalQuantity(o), o.shipDate, PO_STATUS[o.status].label, ms.length ? `${ms.filter((m) => m.status === "completed").length}/${ms.length}` : "No plan"];
        }),
      summary: [
        { label: "Orders", value: orders.length },
        { label: "Total quantity", value: totalQty },
        { label: "Active", value: orders.filter(isActive).length },
        { label: "Shipped", value: orders.filter((o) => o.status === "shipped").length },
      ],
    },
    {
      key: "pending_tasks",
      title: "Pending Tasks",
      description: "Open milestones on active orders, earliest first.",
      headers: ["PO number", "Milestone", "Planned date", "Assigned to", "State"],
      dateColumns: [2],
      rows: [...open].sort(byDate).map((m) => [poNo(m.poId), MILESTONE_LABEL[m.key], m.plannedDate, name(m.assigneeId), deadlineState(m, today).replace("_", " ")]),
      summary: [
        { label: "Open milestones", value: open.length },
        { label: "Due in 7 days", value: open.filter((m) => deadlineState(m, today) === "due_soon").length },
        { label: "Overdue", value: overdue.length },
      ],
    },
    {
      key: "completed",
      title: "Completed Milestones",
      description: "Milestones completed in the last 30 days, with variance against plan.",
      headers: ["PO number", "Milestone", "Planned date", "Actual date", "Variance (days)"],
      dateColumns: [2, 3],
      rows: [...completed30]
        .sort((a, b) => b.actualDate!.localeCompare(a.actualDate!))
        .map((m) => [poNo(m.poId), MILESTONE_LABEL[m.key], m.plannedDate, m.actualDate!, daysBetween(m.plannedDate, m.actualDate!)]),
      summary: [
        { label: "Completed (30 days)", value: completed30.length },
        { label: "On or before plan", value: completed30.filter((m) => daysBetween(m.plannedDate, m.actualDate!) <= 0).length },
        { label: "Late", value: completed30.filter((m) => daysBetween(m.plannedDate, m.actualDate!) > 0).length },
      ],
    },
    {
      key: "overdue",
      title: "Overdue Tasks",
      description: "Milestones past their planned date and not completed.",
      headers: ["PO number", "Milestone", "Planned date", "Days overdue", "Assigned to"],
      dateColumns: [2],
      rows: [...overdue].sort(byDate).map((m) => [poNo(m.poId), MILESTONE_LABEL[m.key], m.plannedDate, daysBetween(m.plannedDate, today), name(m.assigneeId)]),
      summary: [
        { label: "Overdue milestones", value: overdue.length },
        { label: "Orders affected", value: new Set(overdue.map((m) => m.poId)).size },
        { label: "Over 3 days", value: overdue.filter((m) => daysBetween(m.plannedDate, today) > 3).length },
      ],
    },
    {
      key: "upcoming_shipments",
      title: "Upcoming Shipments",
      description: "Active orders shipping in the next 60 days.",
      headers: ["PO number", "Buyer", "Quantity (pcs)", "Ship date", "Days left", "Open milestones"],
      dateColumns: [3],
      rows: upcomingShip.map((o) => [o.poNumber, buyer.get(o.buyerId) ?? "", totalQuantity(o), o.shipDate, daysBetween(today, o.shipDate), open.filter((m) => m.poId === o.id).length]),
      summary: [
        { label: "Shipments (60 days)", value: upcomingShip.length },
        { label: "Quantity (pcs)", value: upcomingShip.reduce((s, o) => s + totalQuantity(o), 0) },
        { label: "With overdue tasks", value: upcomingShip.filter((o) => overdue.some((m) => m.poId === o.id)).length },
      ],
    },
    {
      key: "team",
      title: "Team Activity",
      description: "Workload and delivery per team member.",
      headers: ["Team member", "Orders owned", "Open milestones", "Overdue", "Completed (30 days)"],
      dateColumns: [],
      rows: members.map((m) => [
        m.fullName,
        orders.filter((o) => o.merchandiserId === m.id && isActive(o)).length,
        open.filter((x) => x.assigneeId === m.id).length,
        overdue.filter((x) => x.assigneeId === m.id).length,
        completed30.filter((x) => x.assigneeId === m.id).length,
      ]),
      summary: [
        { label: "Team members", value: members.length },
        { label: "Open milestones", value: open.length },
        { label: "Completed (30 days)", value: completed30.length },
      ],
    },
  ];
}
