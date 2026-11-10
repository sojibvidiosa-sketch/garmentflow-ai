import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { NewPasswordForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the password-reset email via /auth/confirm, which signs the user in. */
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Choose a new password">You will stay signed in after saving it.</AuthHeading>
      <NewPasswordForm />
    </>
  );
}
