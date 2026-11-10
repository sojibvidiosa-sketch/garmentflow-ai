import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignupForm } from "@/components/auth/signup-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <>
      <AuthHeading title="Create your workspace">You become the Company Admin and can invite your team afterwards.</AuthHeading>
      <SignupForm enabled={isSupabaseConfigured} />
    </>
  );
}
