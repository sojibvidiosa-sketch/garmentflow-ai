import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetForm } from "@/components/auth/reset-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password">Enter your work email and we will send a secure reset link.</AuthHeading>
      <ResetForm enabled={isSupabaseConfigured} />
    </>
  );
}
