import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Skeleton } from "@/components/ui/states";
import { DATA_SOURCE, getWorkspace, listAlerts } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/domain/labels";

/** Reads the session in live mode, so it streams in behind the Suspense boundary. */
async function WorkspaceShell({ children }: { children: ReactNode }) {
  const [{ companyName, user, today }, alerts] = await Promise.all([getWorkspace(), listAlerts()]);
  const urgent = alerts.filter((a) => a.severity !== "info").length;

  return (
    <AppShell
      area="workspace"
      companyName={companyName}
      userName={user.fullName}
      userRole={ROLE_LABEL[user.role]}
      alertCount={urgent}
      canSignOut={DATA_SOURCE === "live"}
    >
      {DATA_SOURCE === "demo" && <DemoBanner today={today} />}
      {children}
    </AppShell>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-screen bg-bg lg:pl-[235px]">
      <div className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-[420px] rounded-card" />
      </div>
    </div>
  );
}

export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
