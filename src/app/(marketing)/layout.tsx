import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { CONTACT_EMAIL, SiteHeader } from "@/components/layout/site-header";

const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || "GarmentFlow AI";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      {children}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-secondary">Merchandising and order management for garment buying houses in Bangladesh.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-secondary" aria-label="Footer">
            <Link href="/#contact" className="hover:text-ink">Book a demo</Link>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">{CONTACT_EMAIL}</a>
          </nav>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-[1200px] px-4 py-5 text-caption text-muted sm:px-6">© 2026 {LEGAL_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
