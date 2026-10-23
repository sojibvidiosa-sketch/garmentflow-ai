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
  LogOut,
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
import { signOut } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Screen number in the Figma file. */
  screen: string;
}

const NAV: Record<"workspace" | "admin", NavItem[]> = {
  workspace: [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard, screen: "07" },
    { label: "Purchase Orders", href: "/orders", icon: ClipboardList, screen: "08" },
    { label: "New Order / Upload", href: "/orders/new", icon: FileText, screen: "09" },
    { label: "Documents", href: "/documents", icon: FileStack, screen: "12" },
    { label: "T&A Tracker", href: "/tna", icon: ListChecks, screen: "13" },
    { label: "My Tasks", href: "/tasks", icon: SquareCheckBig, screen: "14" },
    { label: "Delay Alerts", href: "/alerts", icon: TriangleAlert, screen: "15" },
    { label: "Buyers", href: "/buyers", icon: UsersRound, screen: "16" },
    { label: "Email Assistant", href: "/email", icon: Mail, screen: "17" },
    { label: "Reports", href: "/reports", icon: BarChart3, screen: "18" },
    { label: "Team", href: "/team", icon: Users, screen: "19" },
    { label: "Settings", href: "/settings", icon: Settings, screen: "20" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: ShieldCheck, screen: "21" },
    { label: "Companies", href: "/admin/companies", icon: Building2, screen: "22" },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, screen: "23" },
    { label: "AI Usage", href: "/admin/ai-usage", icon: Cpu, screen: "24" },
    { label: "Processing Jobs", href: "/admin/jobs", icon: FileStack, screen: "25" },
    { label: "Support & Logs", href: "/admin/support", icon: ClipboardList, screen: "26" },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/orders") return pathname === "/orders" || /^\/orders\/(?!new)/.test(pathname);
  if (href === "/admin") return pathname === "/admin";
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[77px] items-center px-6">
        <Logo href={area === "admin" ? "/admin" : "/dashboard"} suffix={area === "admin" ? " Admin" : ""} />
      </div>
      <div className="mx-[18px] h-px bg-border" />
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
        <Suspense fallback={<NavLinks items={items} pathname={null} />}>
          <ActiveNavLinks items={items} onNavigate={onNavigate} />
        </Suspense>
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
  canSignOut,
  children,
}: {
  area: "workspace" | "admin";
  companyName: string;
  userName: string;
  userRole: string;
  alertCount?: number;
  /** Live mode only — the demo has no session to end. */
  canSignOut?: boolean;
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
          {canSignOut && (
            <form action={signOut}>
              <button type="submit" className="rounded-control p-2 text-secondary hover:bg-subtle hover:text-ink" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
