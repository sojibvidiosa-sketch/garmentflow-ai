"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { submitPayment } from "@/lib/actions/billing";
import type { Billing, PaymentRequest } from "@/lib/data";
import type { Tone } from "@/lib/domain/labels";
import { BKASH_NUMBER, PLAN_NAME, PLAN_ORDER, PLANS, formatBdt, type PlanKey } from "@/lib/plans";
import { formatDate, formatNumber } from "@/lib/utils";

export const PAYMENT_TONE: Record<PaymentRequest["status"], Tone> = { pending: "yellow", approved: "green", rejected: "red" };
export const PAYMENT_LABEL: Record<PaymentRequest["status"], string> = { pending: "Waiting for verification", approved: "Verified", rejected: "Rejected" };

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span className="text-secondary">{label}</span>
        <span className="font-medium tabular-nums">{formatNumber(used)} / {formatNumber(limit)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red" : pct >= 70 ? "bg-yellow" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BillingView({ billing, isAdmin }: { billing: Billing; isAdmin: boolean }) {
  const router = useRouter();
  const paid = PLAN_ORDER.filter((k) => PLANS[k].priceBdt > 0);
  const [plan, setPlan] = useState<PlanKey>(billing.plan === "business" ? "business" : "starter");
  const [senderNumber, setSender] = useState("");
  const [trxId, setTrx] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string; fields?: Record<string, string> } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const waiting = billing.payments.filter((p) => p.status === "pending").length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await submitPayment({ plan: plan as "starter" | "business", senderNumber, trxId });
      setResult({ ok: res.ok, text: res.ok ? (res.message ?? "Submitted.") : res.error, fields: res.ok ? undefined : res.fieldErrors });
      if (res.ok) {
        setTrx("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Current plan" description="Limits apply to your whole company" />
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[22px] font-semibold tracking-tight text-ink">{PLAN_NAME[billing.plan] ?? billing.plan}</span>
              <Badge tone={billing.status === "active" ? "green" : billing.status === "past_due" ? "red" : "neutral"} dot>
                {billing.status.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}
              </Badge>
            </div>
            {billing.periodEnd && <p className="text-[13px] text-secondary">Paid until {formatDate(billing.periodEnd)}. Renew before this date to keep your limits.</p>}
            <Meter label="Team members" used={billing.seatsUsed} limit={billing.seatLimit} />
            <Meter label="Active purchase orders" used={billing.activePos} limit={billing.poLimit} />
            <Meter label="AI requests this month" used={billing.aiJobsThisMonth} limit={billing.aiJobLimit} />
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Plans" description="Price per company, per month" />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] text-secondary">
                    <th className="px-5 py-2.5 font-medium">Plan</th>
                    <th className="px-3 py-2.5 text-right font-medium">Members</th>
                    <th className="px-3 py-2.5 text-right font-medium">Active POs</th>
                    <th className="px-3 py-2.5 text-right font-medium">AI requests / month</th>
                    <th className="px-5 py-2.5 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ORDER.map((k) => {
                    const p = PLANS[k];
                    return (
                      <tr key={k} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-ink">
                          {p.name} {billing.plan === k && <Badge tone="brand" className="ml-1.5">Current</Badge>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.seats}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.activePos}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatNumber(p.aiRequests)}</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">{p.priceBdt ? formatBdt(p.priceBdt) : "Free"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Pay by bKash" description="Manual collection — your plan is not changed automatically" />
        <CardBody>
          {!BKASH_NUMBER ? (
            <Notice tone="warning" title="bKash payment is not set up yet">Contact us to upgrade your plan.</Notice>
          ) : !isAdmin ? (
            <Notice tone="info">Only a Company Admin can pay for or change the plan.</Notice>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <ol className="space-y-4 text-[13px] text-secondary">
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-light text-[12px] font-semibold text-brand-strong">1</span>
                  <span>
                    Send <strong className="font-semibold text-ink">{formatBdt(PLANS[plan].priceBdt)}</strong> from your bKash app to:
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-control border border-border bg-bg px-3 py-1.5 text-[15px] font-semibold tracking-wide text-ink tabular-nums">{BKASH_NUMBER}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(BKASH_NUMBER).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border px-2.5 text-[12px] font-medium text-ink hover:bg-bg"
                      >
                        {copied ? <Check className="size-3.5 text-green" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-light text-[12px] font-semibold text-brand-strong">2</span>
                  <span>bKash sends you a confirmation message with a transaction ID (TrxID). Enter it in the form.</span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-light text-[12px] font-semibold text-brand-strong">3</span>
                  <span>We check it against our bKash statement and activate your plan for 30 days, usually within one working day. bKash fees, if any, are paid by the sender.</span>
                </li>
              </ol>
              <form onSubmit={submit} noValidate className="space-y-4">
                <Field label="Plan" htmlFor="pay-plan">
                  <Select id="pay-plan" value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)}>
                    {paid.map((k) => (
                      <option key={k} value={k}>{PLANS[k].name} — {formatBdt(PLANS[k].priceBdt)} / month</option>
                    ))}
                  </Select>
                </Field>
                <Field label="bKash number you paid from" htmlFor="pay-sender" error={result?.fields?.senderNumber}>
                  <Input id="pay-sender" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={senderNumber} onChange={(e) => setSender(e.target.value)} aria-invalid={!!result?.fields?.senderNumber} />
                </Field>
                <Field label="Transaction ID (TrxID)" htmlFor="pay-trx" error={result?.fields?.trxId}>
                  <Input id="pay-trx" autoCapitalize="characters" autoComplete="off" placeholder="e.g. 9A7B6C5D4E" value={trxId} onChange={(e) => setTrx(e.target.value)} aria-invalid={!!result?.fields?.trxId} />
                </Field>
                {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
                {waiting > 0 && !result && <Notice tone="info">{waiting === 1 ? "One payment is" : `${waiting} payments are`} waiting for verification.</Notice>}
                <Button type="submit" loading={pending}>Submit payment for verification</Button>
              </form>
            </div>
          )}
        </CardBody>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Payment history" description="Payments you submitted and their verification status" />
          <CardBody className="p-2.5">
            {billing.payments.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-secondary">No payments submitted yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr><Th>Submitted</Th><Th>Plan</Th><Th right>Amount</Th><Th>TrxID</Th><Th>Status</Th><Th>Note</Th></tr>
                </thead>
                <tbody>
                  {billing.payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>{formatDate(p.createdAt.slice(0, 10))}</Td>
                      <Td>{PLAN_NAME[p.plan] ?? p.plan}</Td>
                      <Td right>{formatBdt(p.amountBdt)}</Td>
                      <Td className="tabular-nums">{p.trxId}</Td>
                      <Td><Badge tone={PAYMENT_TONE[p.status]} dot>{PAYMENT_LABEL[p.status]}</Badge></Td>
                      <Td className="text-secondary">{p.reviewNote || "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
