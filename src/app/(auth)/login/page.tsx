import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Sign in">Welcome back. Enter your work email and password.</AuthHeading>
      {/* LoginForm reads ?next= and ?error= from the URL. */}
      <Suspense>
        <LoginForm enabled={isSupabaseConfigured} />
      </Suspense>
    </>
  );
}
