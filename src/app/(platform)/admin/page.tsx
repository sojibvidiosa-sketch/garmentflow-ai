import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformOverview } from "@/lib/data";
import type { Tone } from "@/lib/domain/labels";
import type { Company } from "@/lib/domain/types";
import { formatDate, formatDateTime, formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Admin" };

const SUB: Record<Company["subscription"], { label: string; tone: Tone }> = {
  trialing: { label: "Trial", tone: "blue" },
  active: { label: "Active", tone: "green" },
  past_due: { label: "Past due", tone: "red" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const JOB_KIND = { extraction: "Document extraction", email_draft: "Email draft", report_summary: "Report summary" } as const;

export default async function AdminPage() {
  const { companies, jobs } = await getPlatformOverview();
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const users = companies.reduce((s, c) => s + c.activeUsers, 0);
  const aiJobs = companies.reduce((s, c) => s + c.aiJobs30d, 0);
  const aiCost = companies.reduce((s, c) => s + c.aiCost30dUsd, 0);
  const failed = jobs.filter((j) => j.status === "failed");

  return (
    <>
      <PageHeader title="Platform Admin Dashboard" description="Operating overview across all customer companies (last 30 days)." />

      <div className="mb-6 flex gap-2 rounded-control border border-border bg-surface p-3 text-caption text-secondary">
        <ShieldCheck className="size-4 shrink-0 text-green" />
        Platform admins see usage and billing metadata only. Customer orders and documents are not visible here without an audited, customer-approved support grant.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Companies" value={companies.length} hint={`${companies.filter((c) => c.subscription === "trialing").length} on trial`} tone="blue" />
        <MetricCard label="Active users" value={users} hint="All companies" tone="violet" />
        <MetricCard label="AI jobs (30 days)" value={formatNumber(aiJobs)} hint={`${formatUsd(aiCost)} est.`} tone="neutral" />
        <MetricCard label="Failed jobs" value={failed.length} hint={failed.length ? "Investigate" : "Clear"} tone={failed.length ? "red" : "green"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Companies" />
          <CardBody className="overflow-x-auto p-2.5 pt-4">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-secondary uppercase">
                  {["Company", "Plan", "Subscription", "Users", "Active POs", "AI cost (30d)", "Since"].map((h) => (
                    <th key={h} className="bg-subtle px-3 py-2.5 first:rounded-l-md last:rounded-r-md">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-3 font-semibold">{c.name}</td>
                    <td className="px-3 py-3 capitalize">{c.plan}</td>
                    <td className="px-3 py-3"><Badge tone={SUB[c.subscription].tone}>{SUB[c.subscription].label}</Badge></td>
                    <td className="px-3 py-3 tabular-nums">{c.activeUsers}</td>
                    <td className="px-3 py-3 tabular-nums">{c.activePos}</td>
                    <td className="px-3 py-3 tabular-nums">{formatUsd(c.aiCost30dUsd)}</td>
                    <td className="px-3 py-3 text-secondary">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent AI jobs" description="Failures need follow-up with the customer." />
          <CardBody>
            <ul className="space-y-3">
              {jobs.map((j) => (
                <li key={j.id} className="rounded-control border border-border p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{JOB_KIND[j.kind]}</span>
                    <Badge tone={j.status === "failed" ? "red" : j.status === "succeeded" ? "green" : "blue"}>{j.status}</Badge>
                  </div>
                  <p className="mt-1 text-caption text-secondary">
                    {companyName.get(j.companyId)} · {formatDateTime(j.createdAt)} · {formatNumber(j.tokens)} tokens · {formatUsd(j.costUsd)}
                  </p>
                  {j.error && <p className="mt-1.5 text-caption text-red">{j.error}</p>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
