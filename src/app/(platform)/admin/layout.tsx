import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { DATA_SOURCE, getToday } from "@/lib/data";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell area="admin" companyName="GarmentFlow Platform" userName="Platform Admin" userRole="Platform Super Admin">
      {DATA_SOURCE === "demo" && <DemoBanner today={getToday()} />}
      {children}
    </AppShell>
  );
}
