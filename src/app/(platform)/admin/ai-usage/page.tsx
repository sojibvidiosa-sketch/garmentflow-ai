import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { JOB_KIND } from "@/components/admin/admin-tables";
import { getAdminData } from "@/lib/data";
import { formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Usage" };

export default async function AdminAiUsagePage() {
  const { companies, jobs } = await getAdminData();
  const totalJobs = companies.reduce((s, c) => s + c.aiJobs30d, 0);
  const totalCost = companies.reduce((s, c) => s + c.aiCost30d, 0);
  const byKind = (["extraction", "email_draft", "report_summary"] as const).map((k) => {
    const list = jobs.filter((j) => j.kind === k);
    return { kind: k, count: list.length, cost: list.reduce((s, j) => s + j.costUsd, 0), tokens: list.reduce((s, j) => s + j.inputTokens + j.outputTokens, 0) };
  });
  const ranked = [...companies].sort((a, b) => b.aiCost30d - a.aiCost30d);
  const max = Math.max(...ranked.map((c) => c.aiCost30d), 0.0001);

  return (
    <>
      <PageHeader title="AI Usage & Cost Monitoring" description="Estimated OpenAI cost from recorded token usage. Compare with your OpenAI billing page monthly." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="AI requests (30 days)" value={formatNumber(totalJobs)} tone="neutral" />
        <MetricCard label="Estimated cost (30 days)" value={formatUsd(totalCost)} tone="neutral" />
        <MetricCard label="Average per request" value={formatUsd(totalJobs ? totalCost / totalJobs : 0)} tone="neutral" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Cost by company" description="Last 30 days" />
          <CardBody>
            <ul className="space-y-4">
              {ranked.map((c) => (
                <li key={c.id} className="grid grid-cols-[minmax(0,160px)_1fr_80px] items-center gap-3 text-caption">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="h-5 overflow-hidden rounded bg-violet-light"><span className="block h-full rounded bg-violet" style={{ width: `${(c.aiCost30d / max) * 100}%` }} /></span>
                  <span className="text-right tabular-nums">{formatUsd(c.aiCost30d)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By task type" description="From the most recent jobs" />
          <CardBody className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-secondary uppercase">
                  <th className="pb-2">Task</th><th className="pb-2 text-right">Requests</th><th className="pb-2 text-right">Tokens</th><th className="pb-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byKind.map((k) => (
                  <tr key={k.kind} className="border-t border-border">
                    <td className="py-2.5">{JOB_KIND[k.kind]}</td>
                    <td className="py-2.5 text-right tabular-nums">{k.count}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatNumber(k.tokens)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatUsd(k.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
