"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { resendVerification } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/types";

export function ResendVerification() {
  const email = useSearchParams().get("email") ?? "";
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerification, {});
  const error = state.fieldErrors?.email;
  return (
    <form action={action} noValidate className="mt-8 space-y-5">
      <Field label="Email address" htmlFor="email" error={error} hint="Did not get it? Check spam, then send it again.">
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} placeholder="you@company.com" aria-invalid={!!error} />
      </Field>
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" variant="secondary" className="w-full" loading={pending}>Send the link again</Button>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-strong hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </form>
  );
}
