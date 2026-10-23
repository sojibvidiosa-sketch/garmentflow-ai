"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { signIn, type FormState } from "@/lib/auth/actions";

export function PasswordInput({ id, name, autoComplete, error }: { id: string; name: string; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        className="pr-10"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-secondary hover:bg-subtle" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ enabled }: { enabled: boolean }) {
  const next = useSearchParams().get("next");
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="mt-10 space-y-6">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <Field label="Email address" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!fe.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" error={fe.password} />
      </Field>

      {!enabled && (
        <Notice tone="warning" title="Sign-in is not connected on this demo site">
          Explore the <Link href="/dashboard" className="font-semibold underline">demo workspace</Link> with fictional data.
        </Notice>
      )}
      {state.error && enabled && <Notice tone="error">{state.error}</Notice>}

      <Button type="submit" className="w-full" loading={pending} disabled={!enabled}>Sign in</Button>
      <div className="flex flex-wrap justify-between gap-2 text-caption font-medium">
        <Link href="/forgot-password" className="text-violet hover:underline">Forgot password?</Link>
        <Link href="/signup" className="text-violet hover:underline">Create a workspace</Link>
      </div>
    </form>
  );
}
