"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { requestPasswordReset } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/types";

export function ResetForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});
  const error = state.fieldErrors?.email;

  return (
    <form action={action} noValidate className="mt-10 space-y-6">
      <Field label="Work email" htmlFor="email" error={error}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!error} />
      </Field>
      {!enabled && <Notice tone="warning" title="Password recovery is not connected on this demo site" />}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && enabled && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" className="w-full" loading={pending} disabled={!enabled}>Send reset link</Button>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet hover:underline">
        <ArrowLeft className="size-4" /> Back to login
      </Link>
    </form>
  );
}
