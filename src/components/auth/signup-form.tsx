"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { signUp, type FormState } from "@/lib/auth/actions";
import { PasswordInput } from "./login-form";

export function SignupForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const fe = state.fieldErrors ?? {};

  if (state.message) {
    return (
      <Notice tone="success" title="Check your email" className="mt-10">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} noValidate className="mt-10 space-y-5">
      <Field label="Your full name" htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" placeholder="Sarah Khan" aria-invalid={!!fe.fullName} />
      </Field>
      <Field label="Buying house name" htmlFor="companyName" error={fe.companyName}>
        <Input id="companyName" name="companyName" autoComplete="organization" placeholder="Your company Ltd." aria-invalid={!!fe.companyName} />
      </Field>
      <Field label="Work email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!fe.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" error={fe.password} />
      </Field>
      {!enabled && <Notice tone="warning" title="Sign-up is not connected on this demo site" />}
      {state.error && enabled && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" className="w-full" loading={pending} disabled={!enabled}>Create workspace</Button>
      <p className="text-caption text-secondary">
        Already have an account? <Link href="/login" className="font-medium text-violet hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
