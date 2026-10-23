"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { DEADLINE } from "@/components/domain/status-badges";
import { MilestoneEditor } from "./milestone-editor";
import type { DeadlineState } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, MILESTONE_ORDER, MILESTONE_SHORT } from "@/lib/domain/labels";
import type { Milestone } from "@/lib/domain/types";
import { cn, formatDate } from "@/lib/utils";

type StatefulMilestone = Milestone & { state: DeadlineState };

export interface TnaRow {
  poId: string;
  poNumber: string;
  buyer: string;
  style: string;
  milestones: StatefulMilestone[];
}

const cellStyle: Record<DeadlineState, string> = {
  done: "bg-green-light text-green",
  overdue: "bg-red-light text-red ring-1 ring-red/30",
  blocked: "bg-red-light text-red ring-1 ring-red/30",
  due_soon: "bg-yellow-light text-yellow",
  upcoming: "bg-subtle text-secondary",
};

type Show = "all" | "attention" | "overdue";

export function TnaMatrix({ rows, buyers, members, canEdit }: { rows: TnaRow[]; buyers: string[]; members: { id: string; name: string }[]; canEdit: boolean }) {
  const [buyer, setBuyer] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [selected, setSelected] = useState<{ row: TnaRow; m: StatefulMilestone } | null>(null);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!buyer || r.buyer === buyer) &&
          (show === "all" ||
            r.milestones.some((m) => (show === "overdue" ? m.state === "overdue" || m.state === "blocked" : m.state !== "done" && m.state !== "upcoming"))),
      ),
    [rows, buyer, show],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={buyer} onChange={(e) => setBuyer(e.target.value)} aria-label="Filter by buyer" className="sm:w-44">
          <option value="">All buyers</option>
          {buyers.map((b) => <option key={b}>{b}</option>)}
        </Select>
        <Select value={show} onChange={(e) => setShow(e.target.value as Show)} aria-label="Filter milestones" className="sm:w-64">
          <option value="all">All orders</option>
          <option value="attention">Needs attention (due soon/overdue)</option>
          <option value="overdue">Overdue or blocked only</option>
        </Select>
        <div className="ml-auto flex flex-wrap gap-3 text-caption text-secondary">
          {(["done", "due_soon", "overdue", "upcoming"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-3 rounded border border-black/10", cellStyle[s])} /> {DEADLINE[s].label}
            </span>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title="No orders match" description="Change the filters to see more T&A plans." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-[12px]">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-subtle px-4 py-3 text-left text-[11px] font-semibold text-secondary uppercase">Order</th>
                  {MILESTONE_ORDER.map((k) => (
                    <th key={k} scope="col" title={MILESTONE_LABEL[k]} className="bg-subtle px-1.5 py-3 text-center text-[11px] font-semibold text-secondary">
                      {MILESTONE_SHORT[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.poId}>
                    <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface px-4 py-2.5 text-left font-normal">
                      <Link href={`/orders/${row.poId}`} className="text-[13px] font-semibold hover:text-violet">{row.poNumber}</Link>
                      <span className="block text-caption text-secondary">{row.buyer} · {row.style}</span>
                    </th>
                    {MILESTONE_ORDER.map((k) => {
                      const m = row.milestones.find((x) => x.key === k);
                      if (!m) return <td key={k} className="border-b border-border" />;
                      return (
                        <td key={k} className="border-b border-border px-1 py-2">
                          <button
                            type="button"
                            onClick={() => setSelected({ row, m })}
                            className={cn("flex h-11 w-full flex-col items-center justify-center rounded-md text-[11px] font-medium transition hover:brightness-95", cellStyle[m.state])}
                            aria-label={`${row.poNumber} ${MILESTONE_LABEL[k]}: ${DEADLINE[m.state].label}, planned ${formatDate(m.plannedDate)}`}
                          >
                            <span className="flex items-center gap-1">
                              {m.state === "done" && <Check className="size-3" />}
                              {(m.state === "overdue" || m.state === "blocked") && <CircleAlert className="size-3" />}
                              {formatDate(m.plannedDate, "short")}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MilestoneEditor
        milestone={selected?.m ?? null}
        poNumber={selected?.row.poNumber ?? ""}
        members={members}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
