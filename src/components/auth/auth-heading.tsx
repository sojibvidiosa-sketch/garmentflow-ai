import type { ReactNode } from "react";

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header>
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">{title}</h1>
      {children && <p className="mt-2 text-[14px] leading-relaxed text-secondary">{children}</p>}
    </header>
  );
}
