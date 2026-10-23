import type { Metadata } from "next";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { TnaMatrix, type TnaRow } from "@/components/tna/tna-matrix";
import { getReportData } from "@/lib/data";
import { deadlineState } from "@/lib/domain/deadlines";
import { daysBetween } from "@/lib/utils";

export const metadata: Metadata = { title: "T&A Tracker" };

export default async function TnaPage() {
  const { orders, milestones, buyers, members, today } = await getReportData();
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const active = orders.filter((o) => o.status === "confirmed" || o.status === "in_production");
  const activeIds = new Set(active.map((o) => o.id));
  const activeMs = milestones.filter((m) => activeIds.has(m.poId));

  const rows: TnaRow[] = active
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate))
    .map((o) => ({
      poId: o.id,
      poNumber: o.poNumber,
      buyer: buyerName.get(o.buyerId) ?? "",
      style: o.items[0]?.styleNo ?? "",
      milestones: milestones.filter((m) => m.poId === o.id).map((m) => ({ ...m, state: deadlineState(m, today) })),
    }));

  const completed = activeMs.filter((m) => m.status === "completed").length;
  const dueWeek = activeMs.filter((m) => m.status !== "completed" && daysBetween(today, m.plannedDate) >= 0 && daysBetween(today, m.plannedDate) <= 7).length;
  const overdue = activeMs.filter((m) => deadlineState(m, today) === "overdue").length;

  return (
    <>
      <PageHeader title="T&A Tracker" description="Time & Action milestones for every confirmed and in-production order." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active T&A plans" value={rows.length} hint="Orders" tone="violet" />
        <MetricCard label="Milestones completed" value={completed} hint={`of ${activeMs.length}`} tone="green" />
        <MetricCard label="Due in next 7 days" value={dueWeek} hint="Attention" tone="yellow" />
        <MetricCard label="Overdue milestones" value={overdue} hint={overdue ? "Priority" : "Clear"} tone={overdue ? "red" : "green"} href="/alerts" />
      </div>
      <TnaMatrix rows={rows} buyers={buyers.map((b) => b.name)} members={members.map((m) => ({ id: m.id, name: m.fullName }))} />
    </>
  );
}
