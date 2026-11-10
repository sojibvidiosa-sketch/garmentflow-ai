import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "./badge";
import type { Tone } from "@/lib/domain/labels";

/** Compact KPI tile. The pill tone follows meaning (not always green). */
export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-secondary">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[28px] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <Badge tone={tone}>{hint}</Badge>}
      </div>
    </>
  );
  const cls = "block rounded-card border border-border bg-surface p-4 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-brand/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
