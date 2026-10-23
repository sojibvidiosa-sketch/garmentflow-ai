import Link from "next/link";
import { Logo } from "./logo";
import { ButtonLink } from "@/components/ui/button";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@garmentflow.example";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo suffix=" AI" className="text-[18px]" />
        <nav className="hidden items-center gap-9 text-[13px] font-medium text-secondary md:flex" aria-label="Website">
          <Link href="/#how-it-works" className="hover:text-ink">How it works</Link>
          <Link href="/#features" className="hover:text-ink">Features</Link>
          <Link href="/#pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" className="md:hidden">Sign in</ButtonLink>
          <a href={`mailto:${CONTACT_EMAIL}?subject=GarmentFlow%20AI%20demo%20request`} className="inline-flex h-10 items-center rounded-control bg-dark px-4 text-[13px] font-semibold text-white hover:bg-dark-hover">
            Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}
