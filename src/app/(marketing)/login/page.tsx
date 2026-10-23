import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:py-14">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-11">
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[36px]">Welcome back</h1>
        <p className="mt-2 text-body text-secondary">Sign in to the GarmentFlow workspace</p>
        {/* LoginForm reads ?next= from the URL. */}
        <Suspense>
          <LoginForm enabled={isSupabaseConfigured} />
        </Suspense>
      </section>
      <aside className="hidden flex-col justify-center rounded-[22px] bg-violet-light p-12 lg:flex">
        <p className="text-[41px] leading-tight font-semibold tracking-tight">A calmer way to manage orders.</p>
        <p className="mt-5 max-w-[490px] text-[17px] text-secondary">Buyer information, deadlines and follow-ups, brought together.</p>
      </aside>
    </main>
  );
}
