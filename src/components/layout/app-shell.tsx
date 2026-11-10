"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Cpu,
  CreditCard,
  FileStack,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Sparkles,
  SquareCheckBig,
  TriangleAlert,
  Users,
  UsersRound,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";
import { signOut } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils";

export type Area = "workspace" | "office" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Purple icon: the screen is driven by AI suggestions. */
  ai?: boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Only screens that exist are listed; new ones are added here as they ship. */
const NAV: Record<Area, NavGroup[]> = {
  workspace: [
    {
      label: "Orders",
      items: [
        { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
        { label: "Purchase orders", href: "/app/orders", icon: ClipboardList },
        { label: "Import with AI", href: "/app/import", icon: Sparkles, ai: true },
        { label: "Documents", href: "/app/documents", icon: FileStack },
      ],
    },
    {
      label: "Planning",
      items: [
        { label: "T&A tracker", href: "/app/tna", icon: ListChecks },
        { label: "My tasks", href: "/app/tasks", icon: SquareCheckBig },
        { label: "Delay alerts", href: "/app/alerts", icon: TriangleAlert },
      ],
    },
    {
      label: "Communication",
      items: [
        { label: "Buyers", href: "/app/buyers", icon: UsersRound },
        { label: "Email assistant", href: "/app/email", icon: Mail, ai: true },
        { label: "Reports", href: "/app/reports", icon: BarChart3 },
      ],
    },
  ],
  office: [
    {
      label: "Company",
      items: [
        { label: "Team", href: "/office/team", icon: Users },
        { label: "Settings", href: "/office/settings", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: "Platform",
      items: [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Companies", href: "/admin/companies", icon: Building2 },
        { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "AI usage", href: "/admin/ai-usage", icon: Cpu },
        { label: "Processing jobs", href: "/admin/jobs", icon: Workflow },
        { label: "Support & logs", href: "/admin/support", icon: LifeBuoy },
      ],
    },
  ],
};

const AREA_LABEL: Record<Area, string> = { workspace: "Workspace", office: "Office admin", admin: "Platform admin" };
const HOME: Record<Area, string> = { workspace: "/app/dashboard", office: "/office/team", admin: "/admin" };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string | null; onNavigate?: () => void }) {
  return groups.map((group) => (
    <div key={group.label}>
      <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{group.label}</p>
      <ul className="space-y-px">
        {group.items.map(({ label, href, icon: Icon, ai }) => {
          const active = pathname !== null && isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] transition-colors",
                  active ? "bg-brand-light font-medium text-brand-strong" : "text-secondary hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon className={cn("size-4 shrink-0", ai ? "text-ai" : active ? "text-brand-strong" : "text-muted")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  ));
}

/** Reads the current URL, so it must render inside <Suspense> (Next.js Cache Components). */
function ActiveNavLinks(props: { groups: NavGroup[]; onNavigate?: () => void }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function Sidebar({
  area,
  companyName,
  switchTo,
  onNavigate,
}: {
  area: Area;
  companyName: string;
  switchTo?: { label: string; href: string };
  onNavigate?: () => void;
}) {
  const groups = NAV[area];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo href={HOME[area]} />
      </div>
      <div className="mx-3 flex items-center gap-2.5 rounded-control border border-border bg-bg px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink text-[10px] font-semibold text-white">{initials(companyName)}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-medium text-ink">{companyName}</span>
          <span className="block text-[11px] text-muted">{AREA_LABEL[area]}</span>
        </span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Main">
        <Suspense fallback={<NavLinks groups={groups} pathname={null} />}>
          <ActiveNavLinks groups={groups} onNavigate={onNavigate} />
        </Suspense>
      </nav>
      {switchTo && (
        <div className="border-t border-border p-3">
          <Link href={switchTo.href} onClick={onNavigate} className="flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] text-secondary hover:bg-subtle hover:text-ink">
            <ArrowLeftRight className="size-4 text-muted" aria-hidden />
            {switchTo.label}
          </Link>
        </div>
      )}
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
  switchTo,
  children,
}: {
  area: Area;
  companyName: string;
  userName: string;
  userRole: string;
  alertCount?: number;
  /** Live mode only — the demo has no session to end. */
  canSignOut?: boolean;
  /** Link to another area the user may open (e.g. Office admin for managers). */
  switchTo?: { label: string; href: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg lg:pl-[240px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:shadow-pop">
        Skip to content
      </a>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-border bg-surface lg:block">
        <Sidebar area={area} companyName={companyName} switchTo={switchTo} />
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-[272px] max-w-[85vw] bg-surface shadow-pop">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-control text-secondary hover:bg-subtle" aria-label="Close navigation">
              <X className="size-4" />
            </button>
            <Sidebar area={area} companyName={companyName} switchTo={switchTo} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
        <button type="button" className="-ml-1 grid size-9 place-items-center rounded-control text-secondary hover:bg-subtle lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
        {area === "workspace" ? (
          <form action={`${process.env.NEXT_PUBLIC_BASE_PATH}/app/orders/`} className="relative hidden max-w-sm flex-1 sm:block" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder="Search PO number, buyer or style"
              aria-label="Search purchase orders"
              className="h-9 w-full rounded-control border border-border bg-bg pr-3 pl-9 text-[13px] placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15 focus:outline-none"
            />
          </form>
        ) : (
          <p className="text-[13px] font-medium text-secondary">{AREA_LABEL[area]}</p>
        )}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {area === "workspace" && (
            <Link href="/app/alerts" className="relative grid size-9 place-items-center rounded-control text-secondary hover:bg-subtle hover:text-ink" aria-label={alertCount ? `Delay alerts, ${alertCount} unread` : "Delay alerts"}>
              <Bell className="size-[18px]" aria-hidden />
              {!!alertCount && (
                <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[10px] font-semibold text-white ring-2 ring-surface" aria-hidden>
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </Link>
          )}
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-brand-light text-[11px] font-semibold text-brand-strong">{initials(userName)}</span>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-medium text-ink">{userName}</p>
              <p className="text-[11px] text-muted">{userRole}</p>
            </div>
          </div>
          {canSignOut && (
            <form action={signOut}>
              <button type="submit" className="grid size-9 place-items-center rounded-control text-secondary hover:bg-subtle hover:text-ink" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
