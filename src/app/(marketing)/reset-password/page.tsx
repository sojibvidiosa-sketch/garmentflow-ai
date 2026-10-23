import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the password-reset email via /auth/confirm, which signs the user in. */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-12 sm:px-8 sm:py-20">
      <section className="rounded-card border border-border bg-surface p-6 sm:p-12">
        <h1 className="text-[30px] font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-3 text-body text-secondary">You will stay signed in after saving it.</p>
        <NewPasswordForm />
      </section>
    </main>
  );
}
