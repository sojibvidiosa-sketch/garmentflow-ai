"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";

const email = z.email("Enter a valid work email address.");

/** Phase 1: validation only. Supabase password-recovery email is wired in Phase 2. */
export function ResetForm() {
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = email.safeParse(new FormData(e.currentTarget).get("email"));
    setError(result.success ? undefined : result.error.issues[0]?.message);
    setSubmitted(result.success);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
      <Field label="Work email" htmlFor="email" error={error}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!error} />
      </Field>
      {submitted && (
        <Notice tone="warning" title="Password recovery is not connected yet">
          No email was sent. Reset emails are enabled together with authentication in Phase 2.
        </Notice>
      )}
      <Button type="submit" className="w-full">Send reset link</Button>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet hover:underline">
        <ArrowLeft className="size-4" /> Back to login
      </Link>
    </form>
  );
}
