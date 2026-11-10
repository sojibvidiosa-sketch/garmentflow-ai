import type { Metadata } from "next";
import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResendVerification } from "@/components/auth/resend-verification";

export const metadata: Metadata = { title: "Confirm your email" };

export default function VerifyEmailPage() {
  return (
    <>
      <span className="mb-6 grid size-11 place-items-center rounded-control border border-border bg-bg text-brand-strong">
        <MailCheck className="size-5" aria-hidden />
      </span>
      <AuthHeading title="Confirm your email">
        We sent a confirmation link to your inbox. Open it on this device to finish setting up your workspace. The link expires after 24 hours.
      </AuthHeading>
      {/* Reads ?email= from the URL. */}
      <Suspense>
        <ResendVerification />
      </Suspense>
    </>
  );
}
