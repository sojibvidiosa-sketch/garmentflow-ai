"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BellOff, CheckCheck, Clock, FileWarning, OctagonAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/states";
import { SeverityBadge } from "@/components/domain/status-badges";
import { setAlertsRead } from "@/lib/actions/work";
import type { Alert, AlertSeverity } from "@/lib/domain/deadlines";
import { cn, initials } from "@/lib/utils";

export interface AlertView {
  id: string;
  kind: Alert["kind"];
  severity: AlertSeverity;
  poId: string;
  poNumber: string;
  buyer: string;
  title: string;
  detail: string;
  responsible: string;
}

const ICON = {
  milestone_overdue: TriangleAlert,
  milestone_due_soon: Clock,
  milestone_blocked: OctagonAlert,
  po_review_pending: FileWarning,
} as const;

const TABS: { key: "all" | AlertSeverity; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warning" },
  { key: "info", label: "Upcoming" },
];

export function AlertList({ alerts, initialRead, live }: { alerts: AlertView[]; initialRead: string[]; live: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  // Live mode saves read state per user; demo mode keeps it in memory only.
  const [read, setReadState] = useState<Set<string>>(() => new Set(initialRead));
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function setRead(next: Set<string>) {
    const previous = read;
    setReadState(next);
    if (!live) return;
    const added = [...next].filter((id) => !previous.has(id));
    const removed = [...previous].filter((id) => !next.has(id));
    start(async () => {
      const results = await Promise.all([added.length ? setAlertsRead(added, true) : null, removed.length ? setAlertsRead(removed, false) : null]);
      const failed = results.find((r) => r && !r.ok);
      if (failed && !failed.ok) {
        setReadState(previous);
        setError(failed.error);
      }
    });
  }
  const [hideRead, setHideRead] = useState(false);

  const visible = useMemo(
    () => alerts.filter((a) => (tab === "all" || a.severity === tab) && !(hideRead && read.has(a.id))),
    [alerts, tab, hideRead, read],
  );
  const count = (k: (typeof TABS)[number]["key"]) => alerts.filter((a) => k === "all" || a.severity === k).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-control border border-border bg-surface p-1" role="tablist" aria-label="Severity">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("rounded-md px-3 py-1.5 text-caption font-medium", tab === t.key ? "bg-violet-light text-violet" : "text-secondary hover:text-ink")}
            >
              {t.label} <span className="tabular-nums opacity-70">{count(t.key)}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-caption text-secondary">
          <input type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} className="accent-violet" /> Hide read
        </label>
        <Button variant="secondary" size="sm" className="ml-auto" icon={<CheckCheck className="size-4" />} onClick={() => setRead(new Set(alerts.map((a) => a.id)))}>
          Mark all as read
        </Button>
      </div>

      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <Card>
        {visible.length === 0 ? (
          <EmptyState icon={<BellOff className="size-5" />} title="No alerts here" description="Nothing in this view needs attention right now." />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((a) => {
              const Icon = ICON[a.kind];
              const isRead = read.has(a.id);
              return (
                <li key={a.id} className={cn("flex flex-wrap items-start gap-4 px-5 py-4 sm:flex-nowrap", isRead && "opacity-60")}>
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      a.severity === "critical" ? "bg-red-light text-red" : a.severity === "warning" ? "bg-yellow-light text-yellow" : "bg-blue-light text-blue",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px]">
                      {!isRead && <span className="size-2 rounded-full bg-violet" aria-label="Unread" />}
                      <span className="font-semibold">{a.title}</span>
                      <Link href={`/orders/${a.poId}`} className="font-medium text-violet hover:underline">{a.poNumber}</Link>
                      <span className="text-secondary">· {a.buyer}</span>
                    </p>
                    <p className="mt-1 text-[13px] text-secondary">{a.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-caption text-secondary" title="Responsible">
                      <span className="grid size-6 place-items-center rounded-full bg-subtle text-[10px] font-semibold text-ink">{initials(a.responsible)}</span>
                      <span className="hidden md:inline">{a.responsible}</span>
                    </span>
                    <SeverityBadge severity={a.severity} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const n = new Set(read);
                        if (n.has(a.id)) n.delete(a.id);
                        else n.add(a.id);
                        setRead(n);
                      }}
                    >
                      {isRead ? "Mark unread" : "Mark read"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-caption text-secondary">
        Rules: overdue = planned date passed and not completed (critical after 3 days or for shipment) · upcoming = due within 7 days · AI review pending for 2+ days.{live ? " Read status is saved for your account." : " Read status resets on reload in demo mode."}
      </p>
    </>
  );
}
