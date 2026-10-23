import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { DeadlineBadge, SeverityBadge } from "@/components/domain/status-badges";
import { getReportData, listAlerts } from "@/lib/data";
import { deadlineState } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, PO_STATUS } from "@/lib/domain/labels";
import type { PoStatus } from "@/lib/domain/types";
import { daysBetween, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const PIPELINE: PoStatus[] = ["draft", "pending_review", "confirmed", "in_production", "shipped"];

export default async function DashboardPage() {
  const [{ orders, milestones, members, activity, today }, alerts] = await Promise.all([getReportData(), listAlerts()]);
  const poById = new Map(orders.map((o) => [o.id, o]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  const active = orders.filter((o) => o.status !== "shipped" && o.status !== "cancelled");
  const inProduction = orders.filter((o) => o.status === "in_production").length;
  const pendingReview = orders.filter((o) => o.status === "pending_review").length;
  const overdue = alerts.filter((a) => a.kind === "milestone_overdue").length;

  const upcoming = milestones
    .filter((m) => poById.has(m.poId) && m.status !== "completed" && daysBetween(today, m.plannedDate) >= -14)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
    .slice(0, 6);

  const pipeline = PIPELINE.map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length }));
  const maxCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <>
      <PageHeader
        title="Main Dashboard"
        description="Merchandising performance across all active orders."
        actions={<ButtonLink href="/orders/new" icon={<Plus className="size-4" />}>New order</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active purchase orders" value={active.length} hint="Open" tone="violet" href="/orders" />
        <MetricCard label="Orders in production" value={inProduction} hint="Production" tone="blue" href="/orders" />
        <MetricCard label="Overdue milestones" value={overdue} hint={overdue ? "Action needed" : "Clear"} tone={overdue ? "red" : "green"} href="/alerts" />
        <MetricCard label="Pending AI reviews" value={pendingReview} hint="Review" tone="yellow" href="/orders" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Order pipeline" description="Purchase orders by status" />
          <CardBody>
            <ul className="space-y-4" aria-label="Purchase orders by status">
              {pipeline.map(({ status, count }) => (
                <li key={status} className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-caption">
                  <span className="text-secondary">{PO_STATUS[status].label}</span>
                  <span className="h-6 overflow-hidden rounded-md bg-violet-light">
                    <span className="block h-full rounded-md bg-violet" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming critical dates"
            description="Open milestones, earliest first"
            action={<Link href="/tna" className="text-caption font-semibold text-violet hover:underline">View T&A</Link>}
          />
          <CardBody className="pt-3">
            {upcoming.length === 0 ? (
              <EmptyState title="No open milestones" description="Milestones appear here once a T&A plan is created." />
            ) : (
              <ul className="space-y-1">
                {upcoming.map((m) => (
                  <li key={m.id}>
                    <Link href={`/orders/${m.poId}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-caption odd:bg-subtle hover:bg-violet-light/60">
                      <span className="min-w-0 truncate font-medium">
                        {poById.get(m.poId)?.poNumber} · {MILESTONE_LABEL[m.key]}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-secondary tabular-nums">{formatDate(m.plannedDate, "short")}</span>
                        <DeadlineBadge state={deadlineState(m, today)} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Team activity" description="Latest updates from your team" />
          <CardBody className="pt-3">
            <ul className="space-y-1">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-caption odd:bg-subtle">
                  <span className="min-w-0">
                    <span className="font-semibold">{memberById.get(a.actorId)?.fullName.split(" ")[0]}</span>{" "}
                    <span className="text-secondary">{a.action}</span>
                    {a.poId && poById.get(a.poId) && (
                      <Link href={`/orders/${a.poId}`} className="ml-1 font-medium text-violet hover:underline">
                        {poById.get(a.poId)!.poNumber}
                      </Link>
                    )}
                  </span>
                  <span className="shrink-0 text-muted">{formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Attention needed"
            description="Highest-severity alerts"
            action={<Link href="/alerts" className="inline-flex items-center gap-1 text-caption font-semibold text-violet hover:underline">All alerts <ArrowRight className="size-3.5" /></Link>}
          />
          <CardBody className="pt-3">
            {alerts.length === 0 ? (
              <EmptyState title="Nothing needs attention" description="All milestones are on schedule." />
            ) : (
              <ul className="space-y-1">
                {alerts.slice(0, 5).map((a) => {
                  const po = poById.get(a.poId)!;
                  const m = milestones.find((x) => x.id === a.milestoneId);
                  return (
                    <li key={a.id}>
                      <Link href={`/orders/${a.poId}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-caption odd:bg-subtle hover:bg-violet-light/60">
                        <span className="min-w-0 truncate font-medium">
                          {po.poNumber} · {m ? MILESTONE_LABEL[m.key] : "AI extraction awaiting review"}
                        </span>
                        <SeverityBadge severity={a.severity} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
