import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateCostUsd, EXTRACTION_JSON_SCHEMA, parseExtraction, toReviewFields } from "./extraction";

const reply = {
  readable: true,
  buyer_name: "Northline Apparel",
  po_number: "PO-2026-1082",
  order_date: "2026-10-18",
  ship_date: null,
  currency: "usd",
  unit_price: 6.4,
  season: "SS27",
  special_instructions: "Embroidered chest logo",
  items: [
    {
      style_no: "PLS-48",
      description: "Men's polo",
      fabric: "100% Cotton Piqué",
      gsm: 220,
      total_quantity: 18000,
      colors: [{ color: "Navy", sizes: [{ size: "M", qty: 9000 }] }, { color: "White", sizes: [{ size: "M", qty: 9000 }] }],
    },
    { style_no: "PLS-49", description: null, fabric: null, gsm: 99999, total_quantity: null, colors: [] },
  ],
  evidence: [
    { field: "po_number", quote: "PO Number: PO-2026-1082", confidence: 0.99 },
    { field: "unit_price", quote: "USD 6.40", confidence: 1.4 },
  ],
  missing: ["Shipment date is TBC"],
};

describe("parseExtraction", () => {
  it("accepts a valid reply and normalises values", () => {
    const r = parseExtraction(reply);
    expect(r.currency).toBe("USD");
    expect(r.items[1]!.gsm).toBeNull(); // implausible GSM dropped, not guessed
    expect(r.evidence[1]!.confidence).toBe(1); // clamped to 0–1
  });

  it("drops invalid dates and negative prices instead of keeping them", () => {
    const r = parseExtraction({ ...reply, ship_date: "15/12/2026", order_date: "2026-02-31x", unit_price: -3 });
    expect(r.ship_date).toBeNull();
    expect(r.order_date).toBeNull();
    expect(r.unit_price).toBeNull();
  });

  it("rejects malformed replies", () => {
    expect(() => parseExtraction({ ...reply, items: "nope" })).toThrow(/expected format/);
    expect(() => parseExtraction(null)).toThrow();
  });
});

describe("toReviewFields", () => {
  it("maps values, evidence and missing info for the review screen", () => {
    const view = toReviewFields(parseExtraction(reply), { fileName: "po.pdf", sourceText: "", documentUrl: null });
    const field = (k: string) => view.fields.find((f) => f.key === k)!;
    expect(field("poNumber")).toMatchObject({ value: "PO-2026-1082", confidence: 0.99, source: "PO Number: PO-2026-1082" });
    expect(field("shipDate")).toMatchObject({ value: "", confidence: 0 }); // missing stays empty
    expect(field("quantity").value).toBe("18000");
    expect(view.colors).toHaveLength(2);
    expect(view.extraItems.map((i) => i.styleNo)).toEqual(["PLS-49"]);
    expect(view.missing).toEqual(["Shipment date is TBC"]);
  });

  it("warns when the document was unreadable", () => {
    const view = toReviewFields(parseExtraction({ ...reply, readable: false }), { fileName: "scan.pdf", sourceText: "", documentUrl: null });
    expect(view.missing[0]).toMatch(/could not find legible/);
  });
});

describe("AI schema and cost", () => {
  it("is a strict schema: every property is required and no extras allowed", () => {
    expect(EXTRACTION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect([...EXTRACTION_JSON_SCHEMA.required].sort()).toEqual(Object.keys(EXTRACTION_JSON_SCHEMA.properties).sort());
  });

  it("estimates cost from tokens", () => {
    expect(estimateCostUsd(10_000, 1_000, 0.4, 1.6)).toBe(0.0056);
  });
});

describe("demo-site stand-ins", () => {
  it("every server action has a stand-in with the same exported names", () => {
    const dir = join(__dirname, "..", "actions");
    const modules = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.includes(".static.") && !["types.ts", "guard.ts", "demo-stub.ts"].includes(f) && !f.endsWith(".test.ts"));
    expect(modules.length).toBeGreaterThan(3);
    for (const m of modules) {
      const names = [...readFileSync(join(dir, m), "utf8").matchAll(/export async function (\w+)/g)].map((x) => x[1]).sort();
      const stub = readFileSync(join(dir, m.replace(".ts", ".static.ts")), "utf8");
      const stubNames = [...stub.matchAll(/export (?:const|async function) (\w+)/g)].map((x) => x[1]).sort();
      expect(stubNames, m).toEqual(names);
    }
  });
});
