import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "./badge";
import type { Tone } from "@/lib/domain/labels";

/** Figma "GF / Metric card". The pill tone follows meaning (not always green). */
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
      <p className="text-caption font-medium text-secondary">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[31px] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <Badge tone={tone}>{hint}</Badge>}
      </div>
    </>
  );
  const cls = "block rounded-card border border-border bg-surface p-4 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-violet/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
