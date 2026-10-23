"use client";

import { useState } from "react";
import { Download, Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { Report, ReportKey } from "@/lib/reports";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export function ReportsView({ reports, today }: { reports: Report[]; today: string }) {
  const [key, setKey] = useState<ReportKey>("po_summary");
  const report = reports.find((r) => r.key === key)!;

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

      <Card className="no-print mt-5">
        <CardBody className="flex flex-wrap items-center gap-3 text-[13px] text-secondary">
          <Sparkles className="size-4 text-violet" />
          <span className="flex-1">AI narrative summaries (written from these exact figures) are added in Phase 7.</span>
          <Button variant="secondary" size="sm" disabled>Write summary</Button>
        </CardBody>
      </Card>
    </>
  );
}
