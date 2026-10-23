import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:py-14">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-11">
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[36px]">Create your workspace</h1>
        <p className="mt-2 text-body text-secondary">You become the Company Admin and can invite your team afterwards.</p>
        <SignupForm enabled={isSupabaseConfigured} />
      </section>
      <aside className="hidden flex-col justify-center rounded-[22px] bg-violet-light p-12 lg:flex">
        <p className="text-[36px] leading-tight font-semibold tracking-tight">Your data stays inside your company.</p>
        <ul className="mt-6 space-y-3 text-[15px] text-secondary">
          <li>Each buying house gets a separate, isolated workspace.</li>
          <li>Documents are stored privately and never shared between companies.</li>
          <li>AI suggestions are always reviewed by your team before they become records.</li>
        </ul>
      </aside>
    </main>
  );
}
