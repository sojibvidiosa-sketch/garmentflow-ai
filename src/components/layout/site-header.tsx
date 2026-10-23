import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { ButtonLink } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@garmentflow.example";
/** Public sample-data demo (e.g. the GitHub Pages site), linked from the live site. */
const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || "";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      {!isSupabaseConfigured ? (
        <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-violet px-4 py-2 text-center text-caption font-semibold text-white hover:bg-violet-hover">
          Try the full app with sample data: dashboard, orders, AI review, T&A, alerts, reports
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      ) : (
        DEMO_URL && (
          <a href={DEMO_URL} className="flex items-center justify-center gap-2 bg-violet px-4 py-2 text-center text-caption font-semibold text-white hover:bg-violet-hover">
            Try the interactive demo with sample data
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          </a>
        )
      )}
      <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo suffix=" AI" className="text-[18px]" />
        <nav className="hidden items-center gap-9 text-[13px] font-medium text-secondary lg:flex" aria-label="Website">
          <Link href="/#how-it-works" className="hover:text-ink">How it works</Link>
          <Link href="/#features" className="hover:text-ink">Features</Link>
          <Link href="/#pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/dashboard" variant="primary">{isSupabaseConfigured ? "Sign in" : "Open app"}</ButtonLink>
          <Link href="/contact" className="hidden h-10 items-center rounded-control bg-dark px-4 text-[13px] font-semibold text-white hover:bg-dark-hover sm:inline-flex">
            Book a demo
          </Link>
        </div>
      </div>
    </header>
  );
}
