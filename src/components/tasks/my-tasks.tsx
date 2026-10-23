"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, Notice } from "@/components/ui/states";
import { DeadlineBadge } from "@/components/domain/status-badges";
import { MilestoneEditor } from "@/components/tna/milestone-editor";
import { completeMilestone, createTask, deleteTask, setTaskDone } from "@/lib/actions/work";
import type { DeadlineState } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL } from "@/lib/domain/labels";
import type { Milestone, Task } from "@/lib/domain/types";
import { cn, daysBetween, formatDate } from "@/lib/utils";

export interface WorkMilestone extends Milestone {
  state: DeadlineState;
  poNumber: string;
}

const GROUPS: { key: string; title: string; test: (m: WorkMilestone) => boolean }[] = [
  { key: "overdue", title: "Overdue or blocked", test: (m) => m.state === "overdue" || m.state === "blocked" },
  { key: "soon", title: "Due in the next 7 days", test: (m) => m.state === "due_soon" },
  { key: "later", title: "Later", test: (m) => m.state === "upcoming" },
];

export function MyTasks({
  milestones,
  tasks,
  orders,
  members,
  today,
  canEdit,
}: {
  milestones: WorkMilestone[];
  tasks: Task[];
  orders: { id: string; poNumber: string }[];
  members: { id: string; name: string }[];
  today: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<WorkMilestone | null>(null);
  const [title, setTitle] = useState("");
  const [poId, setPoId] = useState("");
  const [due, setDue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [optimisticTasks, toggleOptimistic] = useOptimistic(tasks, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((t) => (t.id === id ? { ...t, doneAt: done ? new Date().toISOString() : null } : t)),
  );
  const poNumber = new Map(orders.map((o) => [o.id, o.poNumber]));
  const openTasks = optimisticTasks.filter((t) => !t.doneAt).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const doneTasks = optimisticTasks.filter((t) => t.doneAt).slice(0, 10);

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) setMessage({ ok: false, text: res.error ?? "Something went wrong." });
      else {
        if (res.message) setMessage({ ok: true, text: res.message });
        router.refresh();
      }
    });
  }

  function add() {
    if (!title.trim()) return setMessage({ ok: false, text: "Describe the task first." });
    run(async () => {
      const res = await createTask({ title, poId, dueDate: due, assigneeId: "" });
      if (res.ok) {
        setTitle("");
        setDue("");
        setPoId("");
      }
      return res;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="My milestones" description="T&A milestones assigned to you that are still open" />
        <CardBody className="space-y-6">
          {milestones.length === 0 && <EmptyState title="Nothing assigned to you" description="Milestones assigned to you in the T&A tracker appear here." />}
          {GROUPS.map((g) => {
            const items = milestones.filter(g.test).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
            if (!items.length) return null;
            return (
              <section key={g.key}>
                <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-secondary uppercase">{g.title} · {items.length}</h3>
                <ul className="divide-y divide-border rounded-control border border-border">
                  {items.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {MILESTONE_LABEL[m.key]}{" "}
                          <Link href={`/orders/${m.poId}`} className="font-medium text-violet hover:underline">{m.poNumber}</Link>
                        </p>
                        <p className="text-caption text-secondary">Planned {formatDate(m.plannedDate)}{m.notes && ` · ${m.notes}`}</p>
                      </div>
                      <DeadlineBadge state={m.state} />
                      <button type="button" onClick={() => setEditing(m)} className="rounded-control px-2 py-1 text-caption font-semibold text-violet hover:bg-violet-light">Update</button>
                      {canEdit && (
                        <Button size="sm" variant="secondary" icon={<Check className="size-3.5" />} disabled={pending} onClick={() => run(() => completeMilestone(m.id))}>
                          Done
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </CardBody>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Follow-up tasks" description="Your own to-do list, optionally linked to an order" />
        <CardBody className="space-y-4">
          {canEdit && (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chase lab dip approval with buyer" aria-label="New task" />
              <div className="flex gap-2">
                <Select value={poId} onChange={(e) => setPoId(e.target.value)} aria-label="Link to order">
                  <option value="">No order</option>
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.poNumber}</option>)}
                </Select>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="w-40" />
                <Button type="submit" icon={<Plus className="size-4" />} loading={pending} aria-label="Add task" />
              </div>
            </form>
          )}
          {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}
          {openTasks.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-secondary">No open tasks.</p>
          ) : (
            <ul className="divide-y divide-border">
              {openTasks.map((t) => {
                const late = t.dueDate && daysBetween(today, t.dueDate) < 0;
                return (
                  <li key={t.id} className="flex items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-violet"
                      aria-label={`Mark "${t.title}" done`}
                      disabled={!canEdit}
                      onChange={() => start(async () => { toggleOptimistic({ id: t.id, done: true }); const res = await setTaskDone(t.id, true); if (!res.ok) setMessage({ ok: false, text: res.error }); router.refresh(); })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">{t.title}</p>
                      <p className="text-caption text-secondary">
                        {t.dueDate && <span className={cn(late && "font-semibold text-red")}>Due {formatDate(t.dueDate)} · </span>}
                        {t.poId ? <Link href={`/orders/${t.poId}`} className="text-violet hover:underline">{poNumber.get(t.poId) ?? "Order"}</Link> : "General"}
                      </p>
                    </div>
                    {late && <Badge tone="red">Late</Badge>}
                    {canEdit && (
                      <button type="button" onClick={() => run(() => deleteTask(t.id))} className="rounded p-1 text-muted hover:text-red" aria-label={`Delete "${t.title}"`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {doneTasks.length > 0 && (
            <details className="text-[13px]">
              <summary className="cursor-pointer text-caption font-semibold text-secondary">Completed ({doneTasks.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {doneTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-secondary line-through">
                    <Check className="size-3.5 text-green" /> {t.title}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardBody>
      </Card>

      <MilestoneEditor milestone={editing} poNumber={editing?.poNumber ?? ""} members={members} canEdit={canEdit} onClose={() => setEditing(null)} />
    </div>
  );
}
