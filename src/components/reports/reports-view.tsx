"use client";

import { useState, useTransition } from "react";
import { Download, Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/states";
import { generateReportSummary } from "@/lib/actions/ai";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { Report, ReportKey } from "@/lib/reports";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export function ReportsView({ reports, today, aiAvailable, aiNote }: { reports: Report[]; today: string; aiAvailable: boolean; aiNote: string }) {
  const [key, setKey] = useState<ReportKey>("po_summary");
  const report = reports.find((r) => r.key === key)!;
  const [summaries, setSummaries] = useState<Partial<Record<ReportKey, string>>>({});
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [writing, startWriting] = useTransition();

  function writeSummary() {
    setSummaryError(null);
    startWriting(async () => {
      const res = await generateReportSummary(key);
      if (!res.ok) return setSummaryError(res.error);
      setSummaries((s) => ({ ...s, [key]: res.data }));
    });
  }

  const show = (v: string | number, col: number) =>
    report.dateColumns.includes(col) ? formatDate(String(v)) : typeof v === "number" ? formatNumber(v) : v;

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Report type">
        {reports.map((r) => (
          <button
            key={r.key}
            role="tab"
            type="button"
            aria-selected={key === r.key}
            onClick={() => setKey(r.key)}
            className={cn(
              "rounded-control border px-3.5 py-2 text-caption font-medium transition-colors",
              key === r.key ? "border-violet bg-violet-light text-violet" : "border-border bg-surface text-secondary hover:text-ink",
            )}
          >
            {r.title}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {report.summary.map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-4">
            <p className="text-caption text-secondary">{s.label}</p>
            <p className="mt-2 text-[26px] font-semibold tabular-nums">{typeof s.value === "number" ? formatNumber(s.value) : s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title={report.title}
          description={report.description}
          action={
            <div className="no-print flex gap-2">
              <Button variant="secondary" size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>Print / PDF</Button>
              <Button
                size="sm"
                icon={<Download className="size-4" />}
                disabled={report.rows.length === 0}
                onClick={() => downloadCsv(`${report.key.replace("_", "-")}-${today}.csv`, toCsv(report.headers, report.rows))}
              >
                Export CSV
              </Button>
            </div>
          }
        />
        <CardBody className="p-2.5 pt-4">
          {report.rows.length === 0 ? (
            <EmptyState title="Nothing to report" description="There are no records for this report yet." />
          ) : (
            <Table>
              <thead>
                <tr>{report.headers.map((h, i) => <Th key={h} className={typeof report.rows[0]?.[i] === "number" ? "text-right" : ""}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {report.rows.map((row, ri) => (
                  <Tr key={ri}>
                    {row.map((v, ci) => (
                      <Td key={ci} className={cn(ci === 0 && "font-semibold", typeof v === "number" && "text-right tabular-nums")}>{show(v, ci)}</Td>
                    ))}
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader
          title="Summary for management"
          description={summaries[key] ? "AI-written from the figures above. Check it before sharing." : aiNote}
          action={
            <Button variant="secondary" size="sm" className="no-print" icon={<Sparkles className="size-4" />} loading={writing} disabled={!aiAvailable || report.rows.length === 0} onClick={writeSummary}>
              {summaries[key] ? "Rewrite summary" : "Write summary"}
            </Button>
          }
        />
        <CardBody>
          {summaries[key] ? (
            <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-ink">{summaries[key]}</div>
          ) : (
            <p className="text-[13px] text-secondary">All figures on this page are calculated from your records. The optional summary only describes them; it never changes a number.</p>
          )}
          {summaryError && <Notice tone="error" className="mt-3">{summaryError}</Notice>}
        </CardBody>
      </Card>
    </>
  );
}
