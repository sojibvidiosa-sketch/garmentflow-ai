import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { DATA_SOURCE, getWorkspace, listAlerts } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/domain/labels";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const [{ companyName, user, today }, alerts] = await Promise.all([getWorkspace(), listAlerts()]);
  const urgent = alerts.filter((a) => a.severity !== "info").length;

  return (
    <AppShell area="workspace" companyName={companyName} userName={user.fullName} userRole={ROLE_LABEL[user.role]} alertCount={urgent}>
      {DATA_SOURCE === "demo" && <DemoBanner today={today} />}
      {children}
    </AppShell>
  );
}
