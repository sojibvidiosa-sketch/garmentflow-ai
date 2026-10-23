import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("size-7", className)} aria-hidden>
      <rect x="4.1" y="4.1" width="19.8" height="19.8" rx="3" transform="rotate(45 14 14)" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="10" y="10" width="8" height="8" rx="1" transform="rotate(45 14 14)" fill="currentColor" />
    </svg>
  );
}

export function Logo({ href = "/", suffix = "", className }: { href?: string; suffix?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 text-[17px] font-semibold text-ink", className)}>
      <LogoMark className="text-violet" />
      <span>
        GarmentFlow{suffix && <span className="text-violet">{suffix}</span>}
      </span>
    </Link>
  );
}
