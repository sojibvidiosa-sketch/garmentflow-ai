import Link from "next/link";
import { Logo } from "./logo";
import { ButtonLink } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hellocraftkitto@gmail.com";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/90 backdrop-blur">
      {!isSupabaseConfigured && (
        <p className="bg-yellow-light px-4 py-1.5 text-center text-caption text-[#92400e]">
          Static preview with fictional sample data. Sign-in and saving are switched off here.
        </p>
      )}
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-[14px] text-secondary lg:flex" aria-label="Page sections">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isSupabaseConfigured ? (
            <ButtonLink href="/login" variant="ghost" className="max-sm:hidden">Sign in</ButtonLink>
          ) : (
            <ButtonLink href="/app/dashboard" variant="ghost" className="max-sm:hidden">Open sample workspace</ButtonLink>
          )}
          <ButtonLink href="/#contact">Book a demo</ButtonLink>
        </div>
      </div>
    </header>
  );
}
