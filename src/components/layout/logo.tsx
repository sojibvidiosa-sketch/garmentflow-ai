import Link from "next/link";
import { cn } from "@/lib/utils";

/** Three stacked "flow" bars: an order moving through its milestones. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("size-7", className)} aria-hidden>
      <rect width="28" height="28" rx="7" fill="var(--color-brand)" />
      <rect x="7" y="8" width="14" height="2.6" rx="1.3" fill="#fff" />
      <rect x="7" y="12.7" width="10" height="2.6" rx="1.3" fill="#fff" opacity=".85" />
      <rect x="7" y="17.4" width="6" height="2.6" rx="1.3" fill="#fff" opacity=".7" />
      <circle cx="20" cy="18.7" r="2.2" fill="#c4b5fd" />
    </svg>
  );
}

export function Logo({ href = "/", suffix = " AI", className }: { href?: string; suffix?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink", className)}>
      <LogoMark />
      <span>
        GarmentFlow{suffix && <span className="text-ai-strong">{suffix}</span>}
      </span>
    </Link>
  );
}
