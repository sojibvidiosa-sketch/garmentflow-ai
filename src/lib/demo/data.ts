/**
 * FICTIONAL DEMO DATA — every company, buyer, person and order here is
 * invented. It exists only so the UI can be built and reviewed before the
 * Supabase backend (Phase 2) is connected. Never mix real customer data in.
 */
import { addDays } from "@/lib/utils";
import { MILESTONE_ORDER } from "@/lib/domain/labels";
import type {
  ActivityEntry,
  AiJob,
  Buyer,
  ColorBreakdown,
  Company,
  Member,
  Milestone,
  MilestoneKey,
  Task,
  PoDocument,
  PoStatus,
  PurchaseOrder,
} from "@/lib/domain/types";

/** "Today" for demo mode. Fixed so deadline alerts are reproducible. */
export const DEMO_TODAY = "2026-10-23";
export const DEMO_COMPANY_NAME = "Demo Sourcing Ltd.";

// Deterministic pseudo-random generator so every render shows the same data.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(1058);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

export const members: Member[] = [
  { id: "u-sarah", fullName: "Sarah Khan", email: "sarah@demo-sourcing.test", role: "merch_manager" },
  { id: "u-ayesha", fullName: "Ayesha Rahman", email: "ayesha@demo-sourcing.test", role: "merchandiser" },
  { id: "u-rafiq", fullName: "Rafiq Hossain", email: "rafiq@demo-sourcing.test", role: "merchandiser" },
  { id: "u-sadia", fullName: "Sadia Islam", email: "sadia@demo-sourcing.test", role: "merchandiser" },
  { id: "u-tanvir", fullName: "Tanvir Ahmed", email: "tanvir@demo-sourcing.test", role: "company_admin" },
];

export const CURRENT_USER_ID = "u-sarah";

export const buyers: Buyer[] = [
  { id: "b-northline", name: "Northline Apparel", country: "United Kingdom", contactEmail: "sourcing@northline.test" },
  { id: "b-urban", name: "Urban Mode", country: "Germany", contactEmail: "buying@urbanmode.test" },
  { id: "b-brookfield", name: "Brookfield Basics", country: "United States", contactEmail: "po@brookfield.test" },
  { id: "b-fjord", name: "Fjord & Pine", country: "Sweden", contactEmail: "orders@fjordpine.test" },
  { id: "b-sol", name: "Casa Sol", country: "Spain", contactEmail: "compras@casasol.test" },
];

const styles = [
  { description: "Men's Polo Shirt", fabric: "100% Cotton Piqué", gsm: 220, prefix: "PLS" },
  { description: "Denim Jacket", fabric: "98% Cotton 2% Elastane Denim", gsm: 380, prefix: "DJK" },
  { description: "Crew Neck Tee", fabric: "100% Combed Cotton Single Jersey", gsm: 160, prefix: "TEE" },
  { description: "Ladies Hoodie", fabric: "80% Cotton 20% Polyester Fleece", gsm: 300, prefix: "HOD" },
  { description: "Kids Jogger", fabric: "60% Cotton 40% Polyester Terry", gsm: 260, prefix: "JOG" },
  { description: "Oxford Shirt", fabric: "100% Cotton Oxford", gsm: 125, prefix: "OXF" },
] as const;

const palettes = [
  ["Navy", "White"],
  ["Black", "Heather Grey", "Olive"],
  ["Indigo"],
  ["Sand", "Forest"],
  ["Sky Blue", "White", "Pink"],
] as const;

const SIZES = ["S", "M", "L", "XL"];
const RATIO = [0.2, 0.35, 0.3, 0.15];

/** Offset in days before the ship date for each milestone in the template. */
const OFFSETS: Record<MilestoneKey, number> = {
  fit_sample: -95,
  lab_dip: -88,
  fabric_booking: -80,
  fabric_inhouse: -55,
  pp_sample: -45,
  production_start: -38,
  inline_inspection: -20,
  final_inspection: -6,
  shipment: 0,
};

function colorBreakdown(total: number, colors: readonly string[]): ColorBreakdown[] {
  const perColor = Math.round(total / colors.length / 100) * 100;
  return colors.map((color) => ({
    color,
    sizes: SIZES.map((size, i) => ({ size, qty: Math.round((perColor * RATIO[i]!) / 10) * 10 })),
  }));
}

const merchandisers = ["u-ayesha", "u-rafiq", "u-sadia", "u-sarah"];

// Ship dates spread from ~6 weeks ago to ~4 months ahead of DEMO_TODAY.
const shipOffsets = [-40, -12, 6, 12, 18, 25, 30, 34, 41, 48, 55, 60, 66, 72, 79, 85, 92, 99, 106, 113, 120, 4, 52, 70];

export const purchaseOrders: PurchaseOrder[] = [];
export const milestones: Milestone[] = [];

shipOffsets.forEach((offset, index) => {
  const n = 1058 + index;
  const id = `po-${n}`;
  const style = pick(styles);
  const buyer = buyers[index % buyers.length]!;
  const shipDate = addDays(DEMO_TODAY, offset);
  const orderDate = addDays(shipDate, -110);
  const total = Math.round((6000 + rand() * 24000) / 500) * 500;

  let status: PoStatus;
  if (offset < -20) status = "shipped";
  else if (index === 21 || index === 22) status = "pending_review";
  else if (index === 23) status = "draft";
  else if (offset < 45) status = "in_production";
  else status = "confirmed";

  const createdAt =
    status === "pending_review" ? `${addDays(DEMO_TODAY, index === 21 ? -4 : -1)}T09:30:00Z` : `${orderDate}T08:00:00Z`;

  purchaseOrders.push({
    id,
    poNumber: `PO-2026-${n}`,
    buyerId: buyer.id,
    season: offset > 60 ? "SS27" : "AW26",
    status,
    shipDate,
    orderDate,
    merchandiserId: merchandisers[index % merchandisers.length]!,
    currency: "USD",
    unitPrice: status === "pending_review" ? null : Math.round((3 + rand() * 12) * 100) / 100,
    notes: index % 3 === 0 ? "Buyer requested weekly production photos." : "",
    specialInstructions:
      index % 2 === 0 ? "Individual polybag with size sticker. Carton max 15 kg." : "Hangtag per buyer artwork v3.",
    items: [
      {
        id: `${id}-i1`,
        styleNo: `${style.prefix}-${String(10 + (index % 40)).padStart(2, "0")}`,
        description: style.description,
        fabric: style.fabric,
        gsm: style.gsm,
        colors: colorBreakdown(total, pick(palettes)),
      },
    ],
    createdAt,
  });

  if (status === "draft" || status === "pending_review") return; // T&A plan is created after approval

  // Some orders slip: their in-flight milestone stays open past its planned date.
  const slipping = index % 4 === 1 || index === 3;
  for (const key of MILESTONE_ORDER) {
    const plannedDate = addDays(shipDate, OFFSETS[key]);
    const isPast = plannedDate < DEMO_TODAY;
    const isRecent = isPast && plannedDate >= addDays(DEMO_TODAY, -9);
    let msStatus: Milestone["status"] = "not_started";
    let actualDate: string | null = null;
    if (status === "shipped" || (isPast && !(slipping && isRecent))) {
      msStatus = "completed";
      actualDate = addDays(plannedDate, Math.floor(rand() * 3) - 1);
    } else if (isPast) {
      msStatus = index === 9 && key === "fabric_inhouse" ? "blocked" : "in_progress";
    } else if (plannedDate <= addDays(DEMO_TODAY, 5)) {
      msStatus = "in_progress";
    }
    milestones.push({
      id: `${id}-${key}`,
      poId: id,
      key,
      plannedDate,
      actualDate,
      status: msStatus,
      assigneeId: merchandisers[(index + MILESTONE_ORDER.indexOf(key)) % merchandisers.length]!,
      priority: key === "shipment" || key === "fabric_inhouse" ? "high" : "normal",
      notes: msStatus === "blocked" ? "Mill reports dyeing delay; awaiting revised ETA." : "",
    });
  }
});

export const documents: PoDocument[] = purchaseOrders.flatMap((po, i) => {
  const docs: PoDocument[] = [
    {
      id: `${po.id}-d1`,
      poId: po.id,
      fileName: `${po.poNumber}.pdf`,
      kind: "purchase_order",
      sizeBytes: 180_000 + i * 7_300,
      uploadedAt: po.createdAt,
      uploadedBy: po.merchandiserId,
    },
  ];
  if (i % 2 === 0) {
    docs.push({
      id: `${po.id}-d2`,
      poId: po.id,
      fileName: `${po.items[0]!.styleNo}_techpack_v2.pdf`,
      kind: "tech_pack",
      sizeBytes: 2_400_000 + i * 40_000,
      uploadedAt: po.createdAt,
      uploadedBy: po.merchandiserId,
    });
  }
  return docs;
});

export const activity: ActivityEntry[] = [
  { id: "a1", poId: "po-1061", actorId: "u-ayesha", action: "marked PP Sample Approval as completed", at: "2026-10-23T05:40:00Z" },
  { id: "a2", poId: "po-1065", actorId: "u-rafiq", action: "attached a revised tech pack", at: "2026-10-23T04:12:00Z" },
  { id: "a3", poId: "po-1062", actorId: "u-sadia", action: "confirmed fabric booking with the mill", at: "2026-10-22T10:05:00Z" },
  { id: "a4", poId: "po-1079", actorId: "u-sarah", action: "uploaded a buyer PO for AI extraction", at: "2026-10-22T08:31:00Z" },
  { id: "a5", poId: "po-1059", actorId: "u-ayesha", action: "updated shipment date after buyer approval", at: "2026-10-21T11:47:00Z" },
  { id: "a6", poId: "po-1067", actorId: "u-rafiq", action: "added a note to Fabric In-house", at: "2026-10-21T07:20:00Z" },
  { id: "a7", poId: "po-1070", actorId: "u-sadia", action: "changed status to In production", at: "2026-10-20T12:02:00Z" },
];

/** Sample buyer document used by the demo AI review screen. */
export const sampleExtraction = {
  fileName: "Northline_PO_2026-1082.pdf",
  sourceText: `NORTHLINE APPAREL LTD — PURCHASE ORDER

PO Number: PO-2026-1082
Date: 18 Oct 2026
Supplier: Demo Sourcing Ltd., Dhaka

Style: PLS-48  Men's Short Sleeve Polo
Fabric: 100% Cotton Piqué, 220 GSM
Colours: Navy / White
Size ratio S:M:L:XL = 2:3.5:3:1.5

Total quantity: 18,000 pcs (9,000 per colour)
Unit price: USD 6.40 FOB Chattogram

Shipment: TBC — to be confirmed with buyer planning
Packing: individual polybag, 12 pcs per carton

Special instructions: Embroidered chest logo per artwork v2. Pre-production
sample required before bulk cutting.`,
  fields: [
    { key: "buyer", label: "Buyer", value: "Northline Apparel", confidence: 0.98, source: "NORTHLINE APPAREL LTD — PURCHASE ORDER" },
    { key: "poNumber", label: "PO number", value: "PO-2026-1082", confidence: 0.99, source: "PO Number: PO-2026-1082" },
    { key: "styleNo", label: "Style number", value: "PLS-48", confidence: 0.96, source: "Style: PLS-48" },
    { key: "description", label: "Product description", value: "Men's Short Sleeve Polo", confidence: 0.93, source: "Men's Short Sleeve Polo" },
    { key: "fabric", label: "Fabric composition", value: "100% Cotton Piqué", confidence: 0.95, source: "Fabric: 100% Cotton Piqué, 220 GSM" },
    { key: "gsm", label: "GSM", value: "220", confidence: 0.94, source: "220 GSM" },
    { key: "quantity", label: "Total quantity", value: "18000", confidence: 0.97, source: "Total quantity: 18,000 pcs" },
    { key: "unitPrice", label: "Unit price (USD)", value: "6.40", confidence: 0.88, source: "Unit price: USD 6.40 FOB Chattogram" },
    { key: "shipDate", label: "Shipment date", value: "", confidence: 0, source: "Shipment: TBC — to be confirmed" },
  ],
  colors: [
    { color: "Navy", sizes: [{ size: "S", qty: 1800 }, { size: "M", qty: 3150 }, { size: "L", qty: 2700 }, { size: "XL", qty: 1350 }] },
    { color: "White", sizes: [{ size: "S", qty: 1800 }, { size: "M", qty: 3150 }, { size: "L", qty: 2700 }, { size: "XL", qty: 1350 }] },
  ] satisfies ColorBreakdown[],
  specialInstructions: "Embroidered chest logo per artwork v2. Pre-production sample required before bulk cutting.",
  missing: ["Shipment date is not stated (document says “TBC”)."],
};

export const companies: Company[] = [
  { id: "c-demo", name: DEMO_COMPANY_NAME, plan: "business", subscription: "active", activeUsers: 5, activePos: 21, aiJobs30d: 148, aiCost30dUsd: 4.12, createdAt: "2026-06-02" },
  { id: "c-meghna", name: "Meghna Buying House", plan: "starter", subscription: "trialing", activeUsers: 3, activePos: 9, aiJobs30d: 41, aiCost30dUsd: 1.08, createdAt: "2026-09-14" },
  { id: "c-padma", name: "Padma Trade Links", plan: "pilot", subscription: "active", activeUsers: 7, activePos: 34, aiJobs30d: 212, aiCost30dUsd: 6.37, createdAt: "2026-07-21" },
  { id: "c-karnaphuli", name: "Karnaphuli Sourcing", plan: "starter", subscription: "past_due", activeUsers: 2, activePos: 6, aiJobs30d: 12, aiCost30dUsd: 0.31, createdAt: "2026-08-05" },
];

export const aiJobs: AiJob[] = [
  { id: "j-901", companyId: "c-padma", kind: "extraction", status: "failed", error: "Scanned PDF had no extractable text (OCR not enabled)", tokens: 0, costUsd: 0, createdAt: "2026-10-23T03:14:00Z" },
  { id: "j-900", companyId: "c-demo", kind: "extraction", status: "succeeded", error: null, tokens: 6120, costUsd: 0.021, createdAt: "2026-10-22T08:31:00Z" },
  { id: "j-899", companyId: "c-meghna", kind: "email_draft", status: "succeeded", error: null, tokens: 1430, costUsd: 0.004, createdAt: "2026-10-22T06:02:00Z" },
  { id: "j-898", companyId: "c-padma", kind: "extraction", status: "failed", error: "File exceeded 10 MB limit", tokens: 0, costUsd: 0, createdAt: "2026-10-21T12:40:00Z" },
  { id: "j-897", companyId: "c-demo", kind: "report_summary", status: "succeeded", error: null, tokens: 2210, costUsd: 0.007, createdAt: "2026-10-21T09:15:00Z" },
];

export const tasks: Task[] = [
  { id: "t1", poId: "po-1061", title: "Chase trims supplier for revised button samples", assigneeId: "u-sarah", dueDate: "2026-10-24", doneAt: null, createdAt: "2026-10-21T09:00:00Z" },
  { id: "t2", poId: "po-1067", title: "Send mill the updated dyeing ETA to the buyer", assigneeId: "u-sarah", dueDate: "2026-10-22", doneAt: null, createdAt: "2026-10-20T09:00:00Z" },
  { id: "t3", poId: null, title: "Prepare weekly order status for management", assigneeId: "u-sarah", dueDate: "2026-10-27", doneAt: null, createdAt: "2026-10-22T09:00:00Z" },
  { id: "t4", poId: "po-1059", title: "Book inspection slot with QA team", assigneeId: "u-sarah", dueDate: "2026-10-18", doneAt: "2026-10-17T12:00:00Z", createdAt: "2026-10-15T09:00:00Z" },
];
