import { Badge } from "@/components/ui/badge";
import type { AdminCompany, AdminJob } from "@/lib/data";
import type { Tone } from "@/lib/domain/labels";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/utils";

export const SUB_TONE: Record<string, Tone> = { trialing: "blue", active: "green", past_due: "red", cancelled: "neutral" };
export const JOB_KIND: Record<AdminJob["kind"], string> = { extraction: "Document extraction", email_draft: "Email draft", report_summary: "Report summary" };

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`bg-subtle px-3 py-2.5 text-[11px] font-semibold text-secondary uppercase first:rounded-l-md last:rounded-r-md ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`border-b border-border px-3 py-3 ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function CompaniesTable({ companies }: { companies: AdminCompany[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-[13px]">
        <thead>
          <tr><Th>Company</Th><Th>Plan</Th><Th>Subscription</Th><Th right>Members</Th><Th right>Active POs</Th><Th right>AI jobs (30d)</Th><Th right>AI cost (30d)</Th><Th>Last activity</Th></tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id}>
              <Td className="font-semibold">{c.name}<span className="block text-caption font-normal text-secondary">since {formatDateTime(c.createdAt)}</span></Td>
              <Td className="capitalize">{c.plan}</Td>
              <Td><Badge tone={SUB_TONE[c.status] ?? "neutral"}>{c.status.replace("_", " ")}</Badge></Td>
              <Td right>{c.members} / {c.seatLimit}</Td>
              <Td right>{c.activePos} / {c.poLimit}</Td>
              <Td right>{formatNumber(c.aiJobs30d)}{c.failedJobs30d > 0 && <span className="block text-caption text-red">{c.failedJobs30d} failed</span>}</Td>
              <Td right>{formatUsd(c.aiCost30d)}</Td>
              <Td className="text-secondary">{c.lastActivity ? formatDateTime(c.lastActivity) : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      {companies.length === 0 && <p className="py-10 text-center text-[13px] text-secondary">No companies yet.</p>}
    </div>
  );
}

export function JobsTable({ jobs }: { jobs: AdminJob[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-[13px]">
        <thead>
          <tr><Th>When</Th><Th>Company</Th><Th>Task</Th><Th>Status</Th><Th right>Tokens</Th><Th right>Cost</Th><Th>Error</Th></tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <Td className="text-secondary">{formatDateTime(j.createdAt)}</Td>
              <Td className="font-medium">{j.companyName}</Td>
              <Td>{JOB_KIND[j.kind]}<span className="block text-caption text-secondary">{j.model || "—"}</span></Td>
              <Td><Badge tone={j.status === "failed" ? "red" : j.status === "succeeded" ? "green" : "blue"}>{j.status}</Badge></Td>
              <Td right>{formatNumber(j.inputTokens + j.outputTokens)}</Td>
              <Td right>{formatUsd(j.costUsd)}</Td>
              <Td className="max-w-[280px] text-caption text-red">{j.error ?? ""}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && <p className="py-10 text-center text-[13px] text-secondary">No AI jobs yet.</p>}
    </div>
  );
}
