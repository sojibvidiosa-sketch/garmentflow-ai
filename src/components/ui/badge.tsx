import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/labels";

/** Figma "GF / Status badge": On track, At risk, Overdue, In production, Neutral. */
const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-secondary border-border",
  violet: "bg-violet-light text-violet border-violet/15",
  green: "bg-green-light text-green border-green/15",
  yellow: "bg-yellow-light text-yellow border-yellow/20",
  red: "bg-red-light text-red border-red/15",
  blue: "bg-blue-light text-blue border-blue/15",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
