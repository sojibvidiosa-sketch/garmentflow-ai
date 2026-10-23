"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Cpu,
  CreditCard,
  FileStack,
  FileText,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  TriangleAlert,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Screen number in the Figma file. */
  screen: string;
  /** Not part of the 12-screen MVP — shown disabled so navigation stays honest. */
  later?: boolean;
}

const NAV: Record<"workspace" | "admin", NavItem[]> = {
  workspace: [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard, screen: "07" },
    { label: "Purchase Orders", href: "/orders", icon: ClipboardList, screen: "08" },
    { label: "New Order / Upload", href: "/orders/new", icon: FileText, screen: "09" },
    { label: "T&A Tracker", href: "/tna", icon: ListChecks, screen: "13" },
    { label: "Delay Alerts", href: "/alerts", icon: TriangleAlert, screen: "15" },
    { label: "Email Assistant", href: "/email", icon: Mail, screen: "17" },
    { label: "Reports", href: "/reports", icon: BarChart3, screen: "18" },
    { label: "Documents", href: "#", icon: FileStack, screen: "12", later: true },
    { label: "My Tasks", href: "#", icon: SquareCheckBig, screen: "14", later: true },
    { label: "Buyers", href: "#", icon: UsersRound, screen: "16", later: true },
    { label: "Team", href: "#", icon: Users, screen: "19", later: true },
    { label: "Settings", href: "#", icon: Settings, screen: "20", later: true },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: ShieldCheck, screen: "21" },
    { label: "Companies", href: "#", icon: Building2, screen: "22", later: true },
    { label: "Subscriptions", href: "#", icon: CreditCard, screen: "23", later: true },
    { label: "AI Usage", href: "#", icon: Cpu, screen: "24", later: true },
    { label: "Processing Jobs", href: "#", icon: FileStack, screen: "25", later: true },
    { label: "Support & Logs", href: "#", icon: ClipboardList, screen: "26", later: true },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/orders") return pathname === "/orders" || (/^\/orders\/(?!new)/.test(pathname));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string | null; onNavigate?: () => void }) {
  return items.map(({ label, href, icon: Icon }) => {
    const active = pathname !== null && isActive(pathname, href);
    return (
      <Link
        key={label}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-3 rounded-control px-3.5 text-[13px] transition-colors",
          active ? "bg-violet-light font-semibold text-violet" : "text-secondary hover:bg-subtle hover:text-ink",
        )}
      >
        <Icon className={cn("size-4", active ? "text-violet" : "text-muted")} aria-hidden />
        {label}
      </Link>
    );
  });
}

/** Reads the current URL, so it must render inside <Suspense> (Next.js Cache Components). */
function ActiveNavLinks(props: { items: NavItem[]; onNavigate?: () => void }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function Sidebar({ area, companyName, onNavigate }: { area: "workspace" | "admin"; companyName: string; onNavigate?: () => void }) {
  const items = NAV[area];
  const live = items.filter((i) => !i.later);
  const later = items.filter((i) => i.later);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[77px] items-center px-6">
        <Logo href={area === "admin" ? "/admin" : "/dashboard"} suffix={area === "admin" ? " Admin" : ""} />
      </div>
      <div className="mx-[18px] h-px bg-border" />
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Main">
        <Suspense fallback={<NavLinks items={live} pathname={null} />}>
          <ActiveNavLinks items={live} onNavigate={onNavigate} />
        </Suspense>
        {later.length > 0 && (
          <>
            <p className="px-3.5 pt-5 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Phase 2</p>
            {later.map(({ label, icon: Icon, screen }) => (
              <span
                key={label}
                className="flex h-9 cursor-not-allowed items-center gap-3 rounded-control px-3.5 text-[13px] text-muted"
                title={`Screen ${screen} is scheduled for Phase 2`}
                aria-disabled="true"
              >
                <Icon className="size-4" aria-hidden />
                {label}
                <span className="ml-auto rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-medium">Soon</span>
              </span>
            ))}
          </>
        )}
      </nav>
      <div className="mx-[18px] h-px bg-border" />
      <div className="flex items-center gap-2.5 px-6 py-5 text-caption font-medium text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-ink text-[10px] text-white">{initials(companyName)}</span>
        <span className="truncate">{companyName}</span>
      </div>
    </div>
  );
}

export function AppShell({
  area,
  companyName,
  userName,
  userRole,
  alertCount,
  children,
}: {
  area: "workspace" | "admin";
  companyName: string;
  userName: string;
  userRole: string;
  alertCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg lg:pl-[235px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[235px] border-r border-border bg-surface lg:block">
        <Sidebar area={area} companyName={companyName} />
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-[260px] max-w-[85vw] bg-surface shadow-pop">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-6 right-3 rounded-md p-1.5 text-secondary hover:bg-subtle" aria-label="Close navigation">
              <X className="size-4" />
            </button>
            <Sidebar area={area} companyName={companyName} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-8 lg:h-[77px]">
        <button type="button" className="-ml-1 rounded-md p-2 text-secondary hover:bg-subtle lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
        <form action={`${process.env.NEXT_PUBLIC_BASE_PATH}/orders/`} className="relative hidden max-w-md flex-1 sm:block" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder="Search PO number, buyer or style…"
            aria-label="Search purchase orders"
            className="h-9 w-full rounded-control border border-transparent bg-bg pr-3 pl-9 text-[13px] placeholder:text-muted focus:border-violet focus:bg-surface focus:outline-none"
          />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {area === "workspace" && (
            <Link href="/alerts" className="relative flex items-center gap-2 rounded-control px-2.5 py-2 text-caption font-medium text-secondary hover:bg-subtle">
              <Bell className="size-4" aria-hidden />
              <span className="hidden sm:inline">Notifications</span>
              {!!alertCount && (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[10px] font-semibold text-white" aria-label={`${alertCount} alerts`}>
                  {alertCount}
                </span>
              )}
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-violet-light text-[11px] font-semibold text-violet">{initials(userName)}</span>
            <div className="hidden leading-tight sm:block">
              <p className="text-caption font-semibold text-ink">{userName}</p>
              <p className="text-[11px] text-secondary">{userRole}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
