import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateCompanyForm } from "@/components/auth/simple-forms";
import { Logo } from "@/components/layout/logo";
import { Skeleton } from "@/components/ui/states";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Set up your workspace" };

async function Onboarding() {
  if (!isSupabaseConfigured) redirect("/dashboard");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { count } = await supabase.from("company_memberships").select("company_id", { count: "exact", head: true }).eq("user_id", data.user.id);
  if (count) redirect("/dashboard");
  const suggested = (data.user.user_metadata?.company_name as string | undefined) ?? "";
  return <CreateCompanyForm suggested={suggested} />;
}

export default function OnboardingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-12">
      <section className="w-full max-w-[520px] rounded-card border border-border bg-surface p-6 sm:p-10">
        <Logo suffix=" AI" />
        <h1 className="mt-8 text-[28px] font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-2 text-body text-secondary">Your email is confirmed. Name your buying house to finish. You will be its Company Admin.</p>
        <Suspense fallback={<Skeleton className="mt-8 h-[120px]" />}>
          <Onboarding />
        </Suspense>
      </section>
    </main>
  );
}
