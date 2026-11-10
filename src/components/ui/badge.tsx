import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/labels";

/** Status pill. Colour always comes with a text label, never colour alone. "ai" marks AI-generated content. */
const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-secondary border-border",
  brand: "bg-brand-light text-brand-strong border-brand/15",
  ai: "bg-ai-light text-ai-strong border-ai/15",
  green: "bg-green-light text-green border-green/15",
  yellow: "bg-yellow-light text-yellow border-yellow/20",
  red: "bg-red-light text-red border-red/15",
  blue: "bg-blue-light text-blue border-blue/15",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
