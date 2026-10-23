import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-[865px] px-4 py-12 sm:px-8 sm:py-20">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-14">
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[36px]">Reset your password</h1>
        <p className="mt-3 text-body text-secondary">Enter your work email to receive a secure password reset link.</p>
        <ResetForm enabled={isSupabaseConfigured} />
      </section>
    </main>
  );
}
