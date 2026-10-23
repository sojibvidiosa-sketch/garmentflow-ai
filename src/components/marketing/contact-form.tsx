"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { submitDemoRequest } from "@/lib/actions/contact";
import type { FormState } from "@/lib/actions/types";

export function ContactForm({ contactEmail }: { contactEmail: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitDemoRequest, {});
  const fe = state.fieldErrors ?? {};

  if (state.message) return <Notice tone="success" title="Request received">{state.message}</Notice>;

  return (
    <form action={action} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" required error={fe.fullName}>
          <Input id="fullName" name="fullName" autoComplete="name" placeholder="Your name" aria-invalid={!!fe.fullName} />
        </Field>
        <Field label="Work email" htmlFor="email" required error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" aria-invalid={!!fe.email} />
        </Field>
        <Field label="Company name" htmlFor="company" required error={fe.company}>
          <Input id="company" name="company" autoComplete="organization" placeholder="Buying house name" aria-invalid={!!fe.company} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+880…" />
        </Field>
        <Field label="Team size" htmlFor="teamSize" className="sm:col-span-2">
          <Select id="teamSize" name="teamSize" defaultValue="">
            <option value="">Choose…</option>
            <option>1–2 users</option>
            <option>3–10 users</option>
            <option>11–30 users</option>
            <option>More than 30 users</option>
          </Select>
        </Field>
      </div>
      <Field label="Main challenge" htmlFor="message">
        <Textarea id="message" name="message" placeholder="Tell us what you need: number of active POs, buyers, current tools…" />
      </Field>
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.error && (
        <Notice tone="error">
          {state.error} <span className="select-all font-semibold">{contactEmail}</span>
        </Notice>
      )}
      <Button type="submit" className="w-full" loading={pending}>Request a demo</Button>
      <p className="text-caption text-secondary">We use these details only to arrange your demo. See our privacy notice.</p>
    </form>
  );
}
