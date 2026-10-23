"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { createCompany, updatePassword } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/types";
import { PasswordInput } from "./login-form";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="mt-10 space-y-5">
      <Field label="New password" htmlFor="password" error={fe.password} hint="At least 8 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" error={fe.password} />
      </Field>
      <Field label="Repeat new password" htmlFor="confirm" error={fe.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" error={fe.confirm} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" className="w-full" loading={pending}>Save new password</Button>
    </form>
  );
}

export function CreateCompanyForm({ suggested }: { suggested: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCompany, {});
  const error = state.fieldErrors?.companyName;
  return (
    <form action={action} noValidate className="mt-8 space-y-5">
      <Field label="Buying house name" htmlFor="companyName" error={error}>
        <Input id="companyName" name="companyName" defaultValue={suggested} placeholder="Your company Ltd." aria-invalid={!!error} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" className="w-full" loading={pending}>Create workspace</Button>
    </form>
  );
}
