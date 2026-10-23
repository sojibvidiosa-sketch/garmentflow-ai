import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { CompaniesTable, JobsTable } from "@/components/admin/admin-tables";
import { getAdminData } from "@/lib/data";
import { formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Admin" };

export default async function AdminPage() {
  const { companies, jobs, leads } = await getAdminData();
  const users = companies.reduce((s, c) => s + c.members, 0);
  const aiJobs = companies.reduce((s, c) => s + c.aiJobs30d, 0);
  const aiCost = companies.reduce((s, c) => s + c.aiCost30d, 0);
  const failed = jobs.filter((j) => j.status === "failed");

  return (
    <>
      <PageHeader title="Platform Admin Dashboard" description="Operating overview across all customer companies (last 30 days)." />
      <div className="mb-6 flex gap-2 rounded-control border border-border bg-surface p-3 text-caption text-secondary">
        <ShieldCheck className="size-4 shrink-0 text-green" />
        Platform admins see usage and billing metadata only. Customer orders and documents are never shown here.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Companies" value={companies.length} hint={`${companies.filter((c) => c.status === "trialing").length} on trial`} tone="blue" href="/admin/companies" />
        <MetricCard label="Active users" value={users} hint="All companies" tone="violet" />
        <MetricCard label="AI jobs (30 days)" value={formatNumber(aiJobs)} hint={`${formatUsd(aiCost)} est.`} tone="neutral" href="/admin/ai-usage" />
        <MetricCard label="Failed jobs" value={failed.length} hint={failed.length ? "Investigate" : "Clear"} tone={failed.length ? "red" : "green"} href="/admin/jobs" />
      </div>
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader title="Companies" action={<Link href="/admin/companies" className="text-caption font-semibold text-violet hover:underline">All companies</Link>} />
          <CardBody className="p-2.5 pt-4"><CompaniesTable companies={companies.slice(0, 8)} /></CardBody>
        </Card>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Recent AI jobs" action={<Link href="/admin/jobs" className="text-caption font-semibold text-violet hover:underline">All jobs</Link>} />
            <CardBody className="p-2.5 pt-4"><JobsTable jobs={jobs.slice(0, 6)} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="New demo requests" action={<Link href="/admin/support" className="text-caption font-semibold text-violet hover:underline">Support</Link>} />
            <CardBody className="space-y-3 pt-3">
              {leads.length === 0 ? <p className="text-[13px] text-secondary">No demo requests yet.</p> : leads.slice(0, 5).map((l) => (
                <div key={l.id} className="rounded-control border border-border p-3 text-[13px]">
                  <p className="font-semibold">{l.company}</p>
                  <p className="text-caption text-secondary">{l.fullName} · {l.email}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
