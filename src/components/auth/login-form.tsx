"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";

const schema = z.object({
  email: z.email("Enter a valid work email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type Errors = Partial<Record<"email" | "password", string>>;

/**
 * Phase 1: validates input only. Real sign-in (Supabase Auth, server-side
 * session cookies, company membership check) is implemented in Phase 2 — the
 * form deliberately does NOT pretend to log anyone in.
 */
export function LoginForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = schema.safeParse(data);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(next);
      setSubmitted(false);
      return;
    }
    setErrors({});
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
      <Field label="Email address" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-secondary hover:bg-subtle" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      {submitted && (
        <Notice tone="warning" title="Sign-in is not connected yet">
          Secure authentication is built in Phase 2. Until then you can explore the{" "}
          <Link href="/dashboard" className="font-semibold underline">demo workspace</Link> with fictional data.
        </Notice>
      )}

      <Button type="submit" className="w-full">Sign in</Button>
      <div className="flex justify-between text-caption font-medium">
        <Link href="/forgot-password" className="text-violet hover:underline">Forgot password?</Link>
        <a href="mailto:support@garmentflow.example" className="text-violet hover:underline">Contact support</a>
      </div>
    </form>
  );
}
