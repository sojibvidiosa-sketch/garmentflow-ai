import { z } from "zod";

/** Purchase order input, validated in the browser and again on the server. */

const day = /^\d{4}-\d{2}-\d{2}$/;

export const sizeQtySchema = z.object({
  size: z.string().trim().min(1, "Name each size.").max(20),
  qty: z.number().int("Use whole pieces.").min(0, "Quantity cannot be negative.").max(10_000_000),
});

export const colorSchema = z.object({
  color: z.string().trim().min(1, "Name each colour.").max(60),
  sizes: z.array(sizeQtySchema).min(1, "Add at least one size."),
});

export const poItemSchema = z.object({
  styleNo: z.string().trim().min(1, "Enter the style number.").max(60),
  description: z.string().trim().max(200),
  fabric: z.string().trim().max(200),
  gsm: z.number().int().min(1, "GSM must be at least 1.").max(2000).nullable(),
  colors: z.array(colorSchema).max(50),
});

export const PO_STATUSES = ["draft", "pending_review", "confirmed", "in_production", "shipped", "cancelled"] as const;

export const poSchema = z.object({
  id: z.string().optional(),
  poNumber: z.string().trim().min(1, "Enter the PO number.").max(60),
  buyerId: z.string(),
  season: z.string().trim().max(40),
  status: z.enum(PO_STATUSES),
  orderDate: z.string().refine((v) => v === "" || day.test(v), "Enter a valid date."),
  shipDate: z.string().regex(day, "Enter the ship date."),
  currency: z.enum(["USD", "EUR", "GBP"]),
  unitPrice: z.number().min(0, "Price cannot be negative.").max(100_000).nullable(),
  merchandiserId: z.string(),
  notes: z.string().max(4000),
  specialInstructions: z.string().max(4000),
  items: z.array(poItemSchema).min(1, "Add at least one style."),
});

export type PoInput = z.infer<typeof poSchema>;

export const buyerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Enter the buyer name.").max(160),
  country: z.string().trim().max(80),
  contactEmail: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email or leave it empty."),
});

export type BuyerInput = z.infer<typeof buyerSchema>;

export function emptyItem(): PoInput["items"][number] {
  return {
    styleNo: "",
    description: "",
    fabric: "",
    gsm: null,
    colors: [{ color: "", sizes: ["S", "M", "L", "XL"].map((size) => ({ size, qty: 0 })) }],
  };
}

/** Maps a stored order to form input. */
export function toPoInput(po: {
  id: string;
  poNumber: string;
  buyerId: string;
  season: string;
  status: PoInput["status"];
  orderDate: string;
  shipDate: string;
  currency: PoInput["currency"];
  unitPrice: number | null;
  merchandiserId: string;
  notes: string;
  specialInstructions: string;
  items: { styleNo: string; description: string; fabric: string; gsm: number | null; colors: PoInput["items"][number]["colors"] }[];
}): PoInput {
  return {
    id: po.id,
    poNumber: po.poNumber,
    buyerId: po.buyerId,
    season: po.season,
    status: po.status,
    orderDate: po.orderDate,
    shipDate: po.shipDate,
    currency: po.currency,
    unitPrice: po.unitPrice,
    merchandiserId: po.merchandiserId,
    notes: po.notes,
    specialInstructions: po.specialInstructions,
    items: po.items.length ? po.items.map((i) => ({ styleNo: i.styleNo, description: i.description, fabric: i.fabric, gsm: i.gsm, colors: i.colors })) : [emptyItem()],
  };
}
