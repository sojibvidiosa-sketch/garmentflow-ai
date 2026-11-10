import { ClipboardList, LayoutDashboard, ListChecks, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/lib/domain/labels";

/* Fictional sample rows. Illustration only: never real customer data or live metrics. */
const rows: { po: string; buyer: string; style: string; next: string; due: string; status: string; tone: Tone }[] = [
  { po: "PO-2041", buyer: "Northline Apparel", style: "Crew tee · 180 GSM", next: "Lab dip approval", due: "14 Nov", status: "On track", tone: "green" },
  { po: "PO-2042", buyer: "Harbor & Co.", style: "Polo · pique", next: "Fabric in-house", due: "10 Nov", status: "Overdue 1 day", tone: "red" },
  { po: "PO-2043", buyer: "Meridian Kids", style: "Hoodie · fleece", next: "PP sample approval", due: "12 Nov", status: "Due in 2 days", tone: "yellow" },
  { po: "PO-2044", buyer: "Northline Apparel", style: "Jogger · terry", next: "Production start", due: "21 Nov", status: "On track", tone: "green" },
];

const nav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: ClipboardList, label: "Purchase orders", active: true },
  { icon: Sparkles, label: "Import with AI", ai: true },
  { icon: ListChecks, label: "T&A tracker" },
  { icon: TriangleAlert, label: "Delay alerts" },
];

/** Static picture of the workspace for the landing page hero. */
export function ProductPreview() {
  return (
    <figure className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-pop" aria-label="Preview of the purchase order list, with fictional sample data">
      <div className="flex h-9 items-center gap-1.5 border-b border-border bg-bg px-3.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="ml-3 text-[11px] text-muted">Sample workspace</span>
      </div>
      <div className="grid md:grid-cols-[190px_minmax(0,1fr)]" aria-hidden>
        <div className="hidden border-r border-border p-3 md:block">
          <p className="px-2 pb-2 text-[10px] font-medium tracking-wide text-muted uppercase">Orders</p>
          <ul className="space-y-px">
            {nav.map(({ icon: Icon, label, active, ai }) => (
              <li key={label} className={`flex h-8 items-center gap-2 rounded-md px-2 text-[12px] ${active ? "bg-brand-light font-medium text-brand-strong" : "text-secondary"}`}>
                <Icon className={`size-3.5 ${ai ? "text-ai" : active ? "text-brand-strong" : "text-muted"}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-ink">Purchase orders</p>
              <p className="text-[12px] text-secondary">4 active · next milestone and deadline per order</p>
            </div>
            <span className="hidden h-8 items-center rounded-md bg-brand px-3 text-[12px] font-medium text-white sm:inline-flex">New order</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="hidden grid-cols-[84px_1.2fr_1.2fr_1.2fr_64px_120px] gap-3 border-b border-border bg-bg px-3 py-2 text-[11px] font-medium text-secondary lg:grid">
              <span>PO</span>
              <span>Buyer</span>
              <span>Style</span>
              <span>Next milestone</span>
              <span>Due</span>
              <span>Status</span>
            </div>
            {rows.map((r) => (
              <div key={r.po} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 text-[12px] last:border-0 lg:grid-cols-[84px_1.2fr_1.2fr_1.2fr_64px_120px]">
                <span className="font-medium text-ink tabular-nums">{r.po}</span>
                <span className="hidden truncate text-secondary lg:block">{r.buyer}</span>
                <span className="hidden truncate text-secondary lg:block">{r.style}</span>
                <span className="col-start-1 truncate text-secondary lg:col-start-auto">{r.next}</span>
                <span className="hidden text-secondary tabular-nums lg:block">{r.due}</span>
                <span className="col-start-2 row-span-2 row-start-1 lg:col-start-auto lg:row-auto">
                  <Badge tone={r.tone} dot>{r.status}</Badge>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

const fields: [string, string, "ok" | "check" | "missing"][] = [
  ["Buyer", "Northline Apparel", "ok"],
  ["PO number", "PO-2041", "ok"],
  ["Fabric", "100% cotton single jersey", "ok"],
  ["GSM", "180", "check"],
  ["Ship date", "Not found in document", "missing"],
];

/** Static picture of the AI review step: purple marks suggestions, a person confirms. */
export function ReviewPreview() {
  return (
    <figure className="rounded-[14px] border border-border bg-surface p-5 shadow-card" aria-label="Preview of the AI review screen, with fictional sample data">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink">Review extracted fields</p>
        <Badge tone="ai">AI suggestion · not saved yet</Badge>
      </div>
      <dl className="mt-4 divide-y divide-border rounded-lg border border-border" aria-hidden>
        {fields.map(([label, value, state]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
            <dt className="w-24 shrink-0 text-secondary">{label}</dt>
            <dd className={`min-w-0 flex-1 truncate ${state === "missing" ? "text-muted italic" : "text-ink"}`}>{value}</dd>
            {state === "ok" && <Badge tone="green">Matched</Badge>}
            {state === "check" && <Badge tone="yellow">Check</Badge>}
            {state === "missing" && <Badge tone="red">Missing</Badge>}
          </div>
        ))}
      </dl>
      <div className="mt-4 flex justify-end gap-2" aria-hidden>
        <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[12px] font-medium text-ink">Edit fields</span>
        <span className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-[12px] font-medium text-white">Approve and create order</span>
      </div>
    </figure>
  );
}
