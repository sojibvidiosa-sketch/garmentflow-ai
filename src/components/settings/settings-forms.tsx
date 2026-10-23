"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { changePassword, switchCompany, updateCompanyName, updateProfile } from "@/lib/actions/team";
import type { CompanySettings } from "@/lib/data";
import { formatNumber, formatUsd } from "@/lib/utils";

type Result = { ok: boolean; text: string } | null;

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setResult({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : (res.error ?? "Something went wrong.") });
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });
  return { result, pending, run };
}

function Meter({ label, used, limit, format = formatNumber }: { label: string; used: number; limit: number; format?: (n: number) => string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span className="text-secondary">{label}</span>
        <span className="font-semibold tabular-nums">{format(used)} / {format(limit)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-subtle">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red" : pct >= 70 ? "bg-yellow" : "bg-violet"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SettingsForms({ settings, fullName, email, isAdmin }: { settings: CompanySettings; fullName: string; email: string; isAdmin: boolean }) {
  const company = useAction();
  const profile = useAction();
  const password = useAction();
  const workspace = useAction();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [name, setName] = useState(fullName);
  const [pw, setPw] = useState({ password: "", confirm: "" });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Company" description={isAdmin ? "Shown to your team across the workspace" : "Only a Company Admin can change this"} />
        <CardBody>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); company.run(() => updateCompanyName(companyName)); }}>
            <Field label="Buying house name" htmlFor="company-name">
              <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isAdmin} />
            </Field>
            {company.result && <Notice tone={company.result.ok ? "success" : "error"}>{company.result.text}</Notice>}
            {isAdmin && <Button type="submit" loading={company.pending}>Save company</Button>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Plan & usage" description="Limits reset or change when your plan changes" />
        <CardBody className="space-y-4">
          <p className="text-[13px]">
            Plan <span className="font-semibold capitalize">{settings.plan}</span> · status <span className="font-semibold capitalize">{settings.status.replace("_", " ")}</span>
          </p>
          <Meter label="Team seats" used={settings.seatsUsed} limit={settings.seatLimit} />
          <Meter label="Active purchase orders" used={settings.activePos} limit={settings.poLimit} />
          <Meter label="AI requests this month" used={settings.aiJobsThisMonth} limit={settings.aiJobLimit} />
          <p className="text-caption text-secondary">Estimated AI cost this month: {formatUsd(settings.aiCostThisMonth)}. To change your plan, contact GarmentFlow support.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your profile" description={email} />
        <CardBody>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); profile.run(() => updateProfile(name)); }}>
            <Field label="Full name" htmlFor="profile-name">
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            {profile.result && <Notice tone={profile.result.ok ? "success" : "error"}>{profile.result.text}</Notice>}
            <Button type="submit" loading={profile.pending}>Save profile</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <CardBody>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); password.run(() => changePassword(pw), () => setPw({ password: "", confirm: "" })); }}>
            <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
              <Input id="new-password" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
            </Field>
            <Field label="Repeat new password" htmlFor="confirm-password">
              <Input id="confirm-password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            {password.result && <Notice tone={password.result.ok ? "success" : "error"}>{password.result.text}</Notice>}
            <Button type="submit" loading={password.pending}>Change password</Button>
          </form>
        </CardBody>
      </Card>

      {settings.companies.length > 1 && (
        <Card>
          <CardHeader title="Switch workspace" description="You belong to more than one buying house" />
          <CardBody className="space-y-3">
            <Select aria-label="Workspace" defaultValue={settings.activeCompanyId} onChange={(e) => workspace.run(() => switchCompany(e.target.value))} disabled={workspace.pending}>
              {settings.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {workspace.result && !workspace.result.ok && <Notice tone="error">{workspace.result.text}</Notice>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
