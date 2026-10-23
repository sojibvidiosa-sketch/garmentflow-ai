import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { listPurchaseOrders, getReportData } from "./data";
import { buildTemplate } from "./email-templates";
import { queryOrders } from "./orders-query";
import { buildReports } from "./reports";
import { validateEmailText, validateUpload } from "./upload-rules";
import { addDays, daysBetween } from "./utils";

describe("date helpers", () => {
  it("counts calendar days without timezone drift", () => {
    expect(daysBetween("2026-11-10", "2026-11-11")).toBe(1);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Polo, "navy"')).toBe('"Polo, ""navy"""');
    expect(toCsv(["a", "b"], [[1, "x\ny"]])).toBe('a,b\r\n1,"x\ny"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("queryOrders", () => {
  it("searches, filters and sorts", async () => {
    const rows = await listPurchaseOrders();
    const base = { q: "", buyer: "", status: "" as const, sort: "quantity" as const, dir: "desc" as const };
    const sorted = queryOrders(rows, base);
    expect(sorted[0]!.quantity).toBeGreaterThanOrEqual(sorted.at(-1)!.quantity);
    expect(queryOrders(rows, { ...base, q: "po-2026-1060" }).map((r) => r.poNumber)).toEqual(["PO-2026-1060"]);
    expect(queryOrders(rows, { ...base, buyer: "Urban Mode" }).every((r) => r.buyerName === "Urban Mode")).toBe(true);
    expect(queryOrders(rows, { ...base, status: "pending_review" })).toHaveLength(2);
    expect(queryOrders(rows, { ...base, q: "zzz-no-match" })).toEqual([]);
  });
});

describe("upload validation", () => {
  it("accepts PDFs up to 10 MB and rejects other files", () => {
    expect(validateUpload({ name: "po.pdf", type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateUpload({ name: "po.exe", type: "application/x-msdownload", size: 1000 })).toMatch(/not a supported/);
    expect(validateUpload({ name: "big.pdf", type: "application/pdf", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(validateUpload({ name: "empty.pdf", type: "application/pdf", size: 0 })).toMatch(/empty/);
  });
  it("requires a meaningful email body", () => {
    expect(validateEmailText("hi")).toMatch(/at least/);
    expect(validateEmailText("x".repeat(100))).toBeNull();
  });
});

describe("reports", () => {
  it("calculates figures from records only", async () => {
    const data = await getReportData();
    const reports = buildReports(data);
    const summary = reports.find((r) => r.key === "po_summary")!;
    expect(summary.rows).toHaveLength(data.orders.length);
    const overdue = reports.find((r) => r.key === "overdue")!;
    expect(overdue.rows.every((r) => typeof r[3] === "number" && (r[3] as number) > 0)).toBe(true);
  });
});

describe("email templates", () => {
  it("uses only the provided order facts", () => {
    const { subject, body } = buildTemplate("fabric_followup", "supplier", "formal", {
      poNumber: "PO-1",
      buyerName: "Buyer",
      styleNo: "ST-1",
      description: "Tee",
      quantity: "1,000",
      shipDate: "15 Dec 2026",
      nextMilestone: null,
      senderName: "Sarah",
      companyName: "Demo",
    });
    expect(subject).toContain("PO-1");
    expect(body).toContain("15 Dec 2026");
    expect(body).toContain("Dear Supplier team,");
  });
});
