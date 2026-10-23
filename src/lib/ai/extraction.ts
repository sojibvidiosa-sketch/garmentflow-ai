/**
 * Garment PO extraction: the JSON schema sent to OpenAI (Structured Outputs)
 * and pure helpers that validate the reply and turn it into review fields.
 * No network code here, so it is unit-tested directly.
 */
import { z } from "zod";
import type { ColorBreakdown } from "@/lib/domain/types";

export const EXTRACTION_FIELDS = [
  "buyer_name",
  "po_number",
  "order_date",
  "ship_date",
  "currency",
  "unit_price",
  "season",
  "style_no",
  "description",
  "fabric",
  "gsm",
  "total_quantity",
  "special_instructions",
] as const;

const nullable = (type: string) => ({ type: [type, "null"] });

/** JSON Schema for OpenAI strict mode: every key required, unknowns null. */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["buyer_name", "po_number", "order_date", "ship_date", "currency", "unit_price", "season", "special_instructions", "items", "evidence", "missing", "readable"],
  properties: {
    readable: { type: "boolean", description: "false if the document has no legible order information" },
    buyer_name: nullable("string"),
    po_number: nullable("string"),
    order_date: { ...nullable("string"), description: "YYYY-MM-DD" },
    ship_date: { ...nullable("string"), description: "YYYY-MM-DD; null if TBC/unclear" },
    currency: { ...nullable("string"), description: "ISO code such as USD" },
    unit_price: nullable("number"),
    season: nullable("string"),
    special_instructions: nullable("string"),
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["style_no", "description", "fabric", "gsm", "total_quantity", "colors"],
        properties: {
          style_no: nullable("string"),
          description: nullable("string"),
          fabric: { ...nullable("string"), description: "fibre composition, e.g. 100% Cotton Piqué" },
          gsm: nullable("integer"),
          total_quantity: nullable("integer"),
          colors: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["color", "sizes"],
              properties: {
                color: { type: "string" },
                sizes: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["size", "qty"],
                    properties: { size: { type: "string" }, qty: { type: "integer" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    evidence: {
      type: "array",
      description: "For each value you filled, the exact short quote from the document it came from",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "quote", "confidence"],
        properties: {
          field: { type: "string", enum: [...EXTRACTION_FIELDS] },
          quote: { type: "string" },
          confidence: { type: "number", description: "0 to 1" },
        },
      },
    },
    missing: { type: "array", items: { type: "string" }, description: "Plain-language list of important information the document does not state" },
  },
} as const;

export const EXTRACTION_INSTRUCTIONS = `You extract purchase order data for a garment buying house in Bangladesh.
Rules:
- Copy values exactly as written. Never guess, calculate or invent commercial values (prices, quantities, dates, PO numbers).
- If a value is missing, unclear, "TBC" or contradictory, return null and add a short note to "missing".
- Dates must be YYYY-MM-DD. Quantities are pieces as whole numbers.
- Only fill a colour/size breakdown when the document states the quantities; do not derive them from ratios.
- For every value you fill, add an evidence entry with the exact short quote it came from and your confidence (0-1).
- Set "readable" to false if the document contains no legible order information.`;

const reply = z.object({
  readable: z.boolean(),
  buyer_name: z.string().nullable(),
  po_number: z.string().nullable(),
  order_date: z.string().nullable(),
  ship_date: z.string().nullable(),
  currency: z.string().nullable(),
  unit_price: z.number().nullable(),
  season: z.string().nullable(),
  special_instructions: z.string().nullable(),
  items: z.array(
    z.object({
      style_no: z.string().nullable(),
      description: z.string().nullable(),
      fabric: z.string().nullable(),
      gsm: z.number().int().nullable(),
      total_quantity: z.number().int().nullable(),
      colors: z.array(z.object({ color: z.string(), sizes: z.array(z.object({ size: z.string(), qty: z.number().int() })) })),
    }),
  ),
  evidence: z.array(z.object({ field: z.enum(EXTRACTION_FIELDS), quote: z.string(), confidence: z.number() })),
  missing: z.array(z.string()),
});

export type ExtractionReply = z.infer<typeof reply>;

/** Validates the model reply. Throws a readable error if it is malformed. */
export function parseExtraction(json: unknown): ExtractionReply {
  const parsed = reply.safeParse(json);
  if (!parsed.success) throw new Error("The AI reply did not match the expected format.");
  const r = parsed.data;
  const iso = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : null);
  return {
    ...r,
    order_date: iso(r.order_date),
    ship_date: iso(r.ship_date),
    currency: r.currency && /^[A-Z]{3}$/.test(r.currency.toUpperCase()) ? r.currency.toUpperCase() : null,
    unit_price: r.unit_price !== null && r.unit_price >= 0 ? r.unit_price : null,
    items: r.items.map((i) => ({
      ...i,
      gsm: i.gsm !== null && i.gsm > 0 && i.gsm < 2000 ? i.gsm : null,
      total_quantity: i.total_quantity !== null && i.total_quantity >= 0 ? i.total_quantity : null,
      colors: i.colors.map((c) => ({ color: c.color, sizes: c.sizes.filter((s) => s.qty >= 0) })),
    })),
    evidence: r.evidence.map((e) => ({ ...e, confidence: Math.min(1, Math.max(0, e.confidence)) })),
  };
}

export interface ReviewField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ReviewExtraction {
  fileName: string;
  sourceText: string;
  documentUrl: string | null;
  currency: "USD" | "EUR" | "GBP";
  fields: ReviewField[];
  colors: ColorBreakdown[];
  specialInstructions: string;
  missing: string[];
  /** Styles after the first one, carried into the order unchanged. */
  extraItems: { styleNo: string; description: string; fabric: string; gsm: number | null; colors: ColorBreakdown[] }[];
}

/** Turns a validated reply into the field list shown on the review screen. */
export function toReviewFields(r: ExtractionReply, meta: { fileName: string; sourceText: string; documentUrl: string | null }): ReviewExtraction {
  const ev = (field: (typeof EXTRACTION_FIELDS)[number]) => r.evidence.find((e) => e.field === field);
  const first = r.items[0];
  const make = (key: string, label: string, field: (typeof EXTRACTION_FIELDS)[number], value: string | number | null | undefined): ReviewField => {
    const e = ev(field);
    const v = value === null || value === undefined ? "" : String(value);
    return { key, label, value: v, confidence: v ? (e?.confidence ?? 0.5) : 0, source: e?.quote ?? "" };
  };
  const quantity = first?.total_quantity ?? (first?.colors.length ? first.colors.reduce((s, c) => s + c.sizes.reduce((t, x) => t + x.qty, 0), 0) : null);
  return {
    ...meta,
    currency: r.currency === "EUR" || r.currency === "GBP" ? r.currency : "USD",
    fields: [
      make("buyer", "Buyer", "buyer_name", r.buyer_name),
      make("poNumber", "PO number", "po_number", r.po_number),
      make("styleNo", "Style number", "style_no", first?.style_no),
      make("description", "Product description", "description", first?.description),
      make("fabric", "Fabric composition", "fabric", first?.fabric),
      make("gsm", "GSM", "gsm", first?.gsm),
      make("quantity", "Total quantity", "total_quantity", quantity),
      make("unitPrice", `Unit price (${r.currency ?? "USD"})`, "unit_price", r.unit_price),
      make("shipDate", "Shipment date", "ship_date", r.ship_date),
    ],
    colors: first?.colors.length ? first.colors : [{ color: "", sizes: ["S", "M", "L", "XL"].map((size) => ({ size, qty: 0 })) }],
    specialInstructions: r.special_instructions ?? "",
    missing: r.readable ? r.missing : ["The AI could not find legible order information in this document.", ...r.missing],
    extraItems: r.items.slice(1).map((i) => ({ styleNo: i.style_no ?? "", description: i.description ?? "", fabric: i.fabric ?? "", gsm: i.gsm, colors: i.colors })),
  };
}

/** Estimated cost in USD from token usage and per-million prices. */
export function estimateCostUsd(inputTokens: number, outputTokens: number, inputPerM: number, outputPerM: number): number {
  return Math.round(((inputTokens * inputPerM + outputTokens * outputPerM) / 1_000_000) * 100000) / 100000;
}
