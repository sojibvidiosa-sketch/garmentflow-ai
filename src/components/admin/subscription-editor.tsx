"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import { SUB_TONE } from "./admin-tables";
import { updateSubscription } from "@/lib/actions/admin";
import type { AdminCompany } from "@/lib/data";

const PRESETS: Record<string, [number, number, number]> = { pilot: [10, 150, 300], starter: [3, 30, 100], business: [10, 150, 500], enterprise: [50, 2000, 3000] };
type Plan = "pilot" | "starter" | "business" | "enterprise";
type Status = "trialing" | "active" | "past_due" | "cancelled";

export function SubscriptionEditor({ companies }: { companies: AdminCompany[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCompany | null>(null);
  const [form, setForm] = useState({ plan: "pilot" as Plan, status: "trialing" as Status, seatLimit: 5, poLimit: 50, aiJobLimit: 300 });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function open(c: AdminCompany) {
    setEditing(c);
    setMessage(null);
    setForm({ plan: c.plan as Plan, status: c.status as Status, seatLimit: c.seatLimit, poLimit: c.poLimit, aiJobLimit: c.aiJobLimit });
  }

  function save() {
    if (!editing) return;
    start(async () => {
      const res = await updateSubscription({ companyId: editing.id, ...form });
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : res.error });
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      {message && !editing && <Notice tone={message.ok ? "success" : "error"} className="mb-4">{message.text}</Notice>}
      <Card className="overflow-x-auto p-2.5">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-secondary uppercase">
              {["Company", "Plan", "Status", "Seats", "Active POs", "AI requests / month", ""].map((h) => (
                <th key={h} className="bg-subtle px-3 py-2.5 first:rounded-l-md last:rounded-r-md">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-border">
                <td className="px-3 py-3 font-semibold">{c.name}</td>
                <td className="px-3 py-3 capitalize">{c.plan}</td>
                <td className="px-3 py-3"><Badge tone={SUB_TONE[c.status] ?? "neutral"}>{c.status.replace("_", " ")}</Badge></td>
                <td className="px-3 py-3 tabular-nums">{c.members} / {c.seatLimit}</td>
                <td className="px-3 py-3 tabular-nums">{c.activePos} / {c.poLimit}</td>
                <td className="px-3 py-3 tabular-nums">{c.aiJobs30d} / {c.aiJobLimit}</td>
                <td className="px-3 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => open(c)}>Change plan</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Plan for ${editing?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={save}>Save plan</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan" htmlFor="sub-plan" hint="Choosing a plan fills its default limits">
            <Select
              id="sub-plan"
              value={form.plan}
              onChange={(e) => {
                const plan = e.target.value as Plan;
                const [seatLimit, poLimit, aiJobLimit] = PRESETS[plan]!;
                setForm({ ...form, plan, seatLimit, poLimit, aiJobLimit });
              }}
            >
              <option value="pilot">Pilot</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="sub-status">
            <Select id="sub-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
              <option value="trialing">Trial</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Seats" htmlFor="sub-seats">
            <Input id="sub-seats" type="number" min={1} value={form.seatLimit} onChange={(e) => setForm({ ...form, seatLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Active PO limit" htmlFor="sub-pos">
            <Input id="sub-pos" type="number" min={1} value={form.poLimit} onChange={(e) => setForm({ ...form, poLimit: Number(e.target.value) })} />
          </Field>
          <Field label="AI requests per month" htmlFor="sub-ai" className="col-span-2">
            <Input id="sub-ai" type="number" min={0} value={form.aiJobLimit} onChange={(e) => setForm({ ...form, aiJobLimit: Number(e.target.value) })} />
          </Field>
          {message && !message.ok && <Notice tone="error" className="col-span-2">{message.text}</Notice>}
          <p className="col-span-2 text-caption">Payments are invoiced manually during the pilot. Changes take effect immediately and are logged.</p>
        </div>
      </Modal>
    </>
  );
}
