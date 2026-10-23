import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Skeleton } from "@/components/ui/states";
import { DATA_SOURCE, getToday } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Live mode: only users listed in platform_admins may open /admin. */
async function AdminGate({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.rpc("is_platform_admin");
    if (data !== true) notFound();
  }
  return (
    <AppShell area="admin" companyName="GarmentFlow Platform" userName="Platform Admin" userRole="Platform Super Admin" canSignOut={isSupabaseConfigured}>
      {DATA_SOURCE === "demo" && <DemoBanner today={await getToday()} />}
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-[420px] rounded-card" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
