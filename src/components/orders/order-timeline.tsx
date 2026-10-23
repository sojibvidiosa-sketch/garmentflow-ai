"use client";

import { useState } from "react";
import { DeadlineBadge, MilestoneStatusBadge } from "@/components/domain/status-badges";
import { MilestoneEditor } from "@/components/tna/milestone-editor";
import type { DeadlineState } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL } from "@/lib/domain/labels";
import type { Milestone } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils";

const dot: Record<DeadlineState, string> = { done: "bg-green", overdue: "bg-red", blocked: "bg-red", due_soon: "bg-yellow", upcoming: "bg-border" };

export function OrderTimeline({
  milestones,
  poNumber,
  members,
  canEdit,
}: {
  milestones: (Milestone & { state: DeadlineState })[];
  poNumber: string;
  members: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<Milestone | null>(null);
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Unassigned";

  return (
    <>
      <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
        {milestones.map((m) => (
          <li key={m.id} className="relative grid grid-cols-[24px_1fr] gap-3 py-2">
            <span className={`z-10 mt-1 size-[9px] justify-self-center rounded-full ring-4 ring-surface ${dot[m.state]}`} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">{MILESTONE_LABEL[m.key]}</p>
                <p className="text-caption text-secondary">
                  Planned {formatDate(m.plannedDate)}
                  {m.actualDate && ` · Done ${formatDate(m.actualDate)}`} · {name(m.assigneeId)}
                </p>
                {m.notes && <p className="mt-1 text-caption text-secondary">{m.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <MilestoneStatusBadge status={m.status} />
                {m.state !== "done" && m.state !== "upcoming" && <DeadlineBadge state={m.state} />}
                <button type="button" onClick={() => setSelected(m)} className="rounded-control px-2 py-1 text-caption font-semibold text-violet hover:bg-violet-light">
                  {canEdit ? "Update" : "View"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <MilestoneEditor milestone={selected} poNumber={poNumber} members={members} canEdit={canEdit} onClose={() => setSelected(null)} />
    </>
  );
}
