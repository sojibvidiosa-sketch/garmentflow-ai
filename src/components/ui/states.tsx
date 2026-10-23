import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Lock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Empty / error / permission states — Figma page "06 · Components & States". */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-11 place-items-center rounded-full bg-violet-light text-violet">{icon}</div>}
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AccessDenied() {
  return (
    <EmptyState
      icon={<Lock className="size-5" />}
      title="You cannot view this company"
      description="Ask a company admin for access."
    />
  );
}

type NoticeTone = "info" | "success" | "warning" | "error";
const noticeStyles: Record<NoticeTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "bg-blue-light text-[#23467f] border-blue/15", Icon: Info },
  success: { cls: "bg-green-light text-green border-green/15", Icon: CheckCircle2 },
  warning: { cls: "bg-yellow-light text-[#7d5210] border-yellow/20", Icon: AlertTriangle },
  error: { cls: "bg-red-light text-red border-red/15", Icon: XCircle },
};

export function Notice({ tone = "info", title, children, className, action }: { tone?: NoticeTone; title?: string; children?: ReactNode; className?: string; action?: ReactNode }) {
  const { cls, Icon } = noticeStyles[tone];
  return (
    <div className={cn("flex gap-3 rounded-control border px-3.5 py-3 text-[13px]", cls, className)} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#eceff0]", className)} aria-hidden />;
}
