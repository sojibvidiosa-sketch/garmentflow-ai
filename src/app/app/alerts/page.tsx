import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AlertList, type AlertView } from "@/components/alerts/alert-list";
import { DATA_SOURCE, getReportData, listAlertReads, listAlerts } from "@/lib/data";
import { MILESTONE_LABEL } from "@/lib/domain/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Delay Alerts" };

export default async function AlertsPage() {
  const [{ orders, milestones, members, buyers }, alerts, reads] = await Promise.all([getReportData(), listAlerts(), listAlertReads()]);
  const po = new Map(orders.map((o) => [o.id, o]));
  const ms = new Map(milestones.map((m) => [m.id, m]));
  const member = new Map(members.map((m) => [m.id, m.fullName]));
  const buyer = new Map(buyers.map((b) => [b.id, b.name]));

  const views: AlertView[] = alerts.map((a) => {
    const order = po.get(a.poId)!;
    const m = a.milestoneId ? ms.get(a.milestoneId) : undefined;
    const title = m ? MILESTONE_LABEL[m.key] : "AI extraction awaiting review";
    const detail =
      a.kind === "milestone_overdue"
        ? `Planned for ${formatDate(a.date)} and still not completed — ${a.days} day${a.days === 1 ? "" : "s"} overdue.`
        : a.kind === "milestone_due_soon"
          ? `Due ${formatDate(a.date)} — ${-a.days === 0 ? "today" : `in ${-a.days} day${-a.days === 1 ? "" : "s"}`}.`
          : a.kind === "milestone_blocked"
            ? `Marked blocked. ${m?.notes ?? ""}`
            : `Extracted ${a.days} days ago and not yet reviewed by a merchandiser.`;
    return {
      id: a.id,
      kind: a.kind,
      severity: a.severity,
      poId: a.poId,
      poNumber: order.poNumber,
      buyer: buyer.get(order.buyerId) ?? "",
      title,
      detail,
      responsible: member.get(a.responsibleId ?? "") ?? "Unassigned",
    };
  });

  return (
    <>
      <PageHeader title="Delay Alerts" description="Rule-based checks on every open milestone. An overdue task needs follow-up — it does not automatically mean the shipment will be late." />
      <AlertList alerts={views} initialRead={reads} live={DATA_SOURCE === "live"} />
    </>
  );
}
