import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { AccessDenied, Skeleton } from "@/components/ui/states";
import { DATA_SOURCE, getWorkspace } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/domain/labels";

/**
 * Office admin area: company-level management. Only Company Admins and
 * Merchandising Managers may open it; the database enforces the same rule
 * on every write through Row Level Security.
 */
async function OfficeShell({ children }: { children: ReactNode }) {
  const { companyName, user, today } = await getWorkspace();
  const allowed = user.role === "company_admin" || user.role === "merch_manager";
  return (
    <AppShell
      area="office"
      companyName={companyName}
      userName={user.fullName}
      userRole={ROLE_LABEL[user.role]}
      canSignOut={DATA_SOURCE === "live"}
      switchTo={{ label: "Back to workspace", href: "/app/dashboard" }}
    >
      {DATA_SOURCE === "demo" && <DemoBanner today={today} />}
      {allowed ? children : <AccessDenied />}
    </AppShell>
  );
}

export default function OfficeLayout({ children }: LayoutProps<"/office">) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-[420px] rounded-card" />}>
      <OfficeShell>{children}</OfficeShell>
    </Suspense>
  );
}
