import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { ButtonLink } from "@/components/ui/button";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@garmentflow.example";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2 bg-violet px-4 py-2 text-center text-caption font-semibold text-white hover:bg-violet-hover"
      >
        Try the full app with sample data: dashboard, orders, AI review, T&A, alerts, reports
        <ArrowRight className="size-3.5 shrink-0" aria-hidden />
      </Link>
      <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo suffix=" AI" className="text-[18px]" />
        <nav className="hidden items-center gap-9 text-[13px] font-medium text-secondary lg:flex" aria-label="Website">
          <Link href="/#how-it-works" className="hover:text-ink">How it works</Link>
          <Link href="/#features" className="hover:text-ink">Features</Link>
          <Link href="/#pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/dashboard" variant="primary">Open app</ButtonLink>
          <a href={`mailto:${CONTACT_EMAIL}?subject=GarmentFlow%20AI%20demo%20request`} className="hidden h-10 items-center rounded-control bg-dark px-4 text-[13px] font-semibold text-white hover:bg-dark-hover sm:inline-flex">
            Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}
