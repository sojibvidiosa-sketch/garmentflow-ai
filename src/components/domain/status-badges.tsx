import { Badge } from "@/components/ui/badge";
import { MILESTONE_STATUS, PO_STATUS } from "@/lib/domain/labels";
import type { DeadlineState, AlertSeverity } from "@/lib/domain/deadlines";
import type { MilestoneStatus, PoStatus } from "@/lib/domain/types";
import type { Tone } from "@/lib/domain/labels";

export function PoStatusBadge({ status }: { status: PoStatus }) {
  const s = PO_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const s = MILESTONE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const DEADLINE: Record<DeadlineState, { label: string; tone: Tone }> = {
  done: { label: "Done", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  due_soon: { label: "Due soon", tone: "yellow" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  blocked: { label: "Blocked", tone: "red" },
};

export function DeadlineBadge({ state }: { state: DeadlineState }) {
  const s = DEADLINE[state];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export const SEVERITY: Record<AlertSeverity, { label: string; tone: Tone }> = {
  critical: { label: "Critical", tone: "red" },
  warning: { label: "Warning", tone: "yellow" },
  info: { label: "Upcoming", tone: "blue" },
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = SEVERITY[severity];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}
