import { describe, expect, it } from "vitest";
import { computeAlerts, deadlineState, totalQuantity } from "./deadlines";
import type { Milestone, PurchaseOrder } from "./types";

const TODAY = "2026-11-11";

function ms(overrides: Partial<Milestone>): Milestone {
  return {
    id: "m1",
    poId: "po1",
    key: "fabric_inhouse",
    plannedDate: "2026-11-10",
    actualDate: null,
    status: "in_progress",
    assigneeId: "u1",
    priority: "high",
    notes: "",
    ...overrides,
  };
}

function po(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: "po1",
    poNumber: "PO-1",
    buyerId: "b1",
    season: "AW26",
    status: "in_production",
    shipDate: "2026-12-20",
    orderDate: "2026-09-01",
    merchandiserId: "u2",
    currency: "USD",
    unitPrice: 5,
    notes: "",
    specialInstructions: "",
    items: [],
    createdAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("deadlineState", () => {
  it("flags fabric expected Nov 10 and still open on Nov 11 as overdue (spec example)", () => {
    expect(deadlineState(ms({}), TODAY)).toBe("overdue");
  });
  it("is done when completed, even if the date passed", () => {
    expect(deadlineState(ms({ status: "completed" }), TODAY)).toBe("done");
  });
  it("is due soon on the day itself and within 7 days, upcoming after", () => {
    expect(deadlineState(ms({ plannedDate: TODAY }), TODAY)).toBe("due_soon");
    expect(deadlineState(ms({ plannedDate: "2026-11-18" }), TODAY)).toBe("due_soon");
    expect(deadlineState(ms({ plannedDate: "2026-11-19" }), TODAY)).toBe("upcoming");
  });
  it("reports blocked separately", () => {
    expect(deadlineState(ms({ status: "blocked" }), TODAY)).toBe("blocked");
  });
});

describe("computeAlerts", () => {
  it("creates a warning for 1 day overdue and escalates to critical after 3 days", () => {
    const [a] = computeAlerts([po()], [ms({})], TODAY);
    expect(a).toMatchObject({ kind: "milestone_overdue", severity: "warning", days: 1, responsibleId: "u1" });
    const [b] = computeAlerts([po()], [ms({ plannedDate: "2026-11-06" })], TODAY);
    expect(b?.severity).toBe("critical");
  });
  it("falls back to the PO merchandiser when no assignee", () => {
    const [a] = computeAlerts([po()], [ms({ assigneeId: null })], TODAY);
    expect(a?.responsibleId).toBe("u2");
  });
  it("ignores shipped and cancelled orders", () => {
    expect(computeAlerts([po({ status: "shipped" })], [ms({})], TODAY)).toEqual([]);
    expect(computeAlerts([po({ status: "cancelled" })], [ms({})], TODAY)).toEqual([]);
  });
  it("flags POs waiting for AI review for 2+ days", () => {
    const alerts = computeAlerts([po({ status: "pending_review", createdAt: "2026-11-08T10:00:00Z" })], [], TODAY);
    expect(alerts).toEqual([expect.objectContaining({ kind: "po_review_pending", days: 3 })]);
    expect(computeAlerts([po({ status: "pending_review", createdAt: "2026-11-10T10:00:00Z" })], [], TODAY)).toEqual([]);
  });
  it("sorts critical before warning before info", () => {
    const alerts = computeAlerts(
      [po()],
      [ms({ id: "a", plannedDate: "2026-11-14" }), ms({ id: "b", plannedDate: "2026-11-10" }), ms({ id: "c", plannedDate: "2026-11-01" })],
      TODAY,
    );
    expect(alerts.map((a) => a.severity)).toEqual(["critical", "warning", "info"]);
  });
});

describe("totalQuantity", () => {
  it("sums every colour and size across items", () => {
    const order = po({
      items: [
        { id: "i", styleNo: "S", description: "", fabric: "", gsm: null, colors: [{ color: "Navy", sizes: [{ size: "S", qty: 10 }, { size: "M", qty: 5 }] }, { color: "Red", sizes: [{ size: "S", qty: 1 }] }] },
      ],
    });
    expect(totalQuantity(order)).toBe(16);
  });
});
