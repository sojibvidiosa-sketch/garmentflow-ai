"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Notice } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { reviewPayment } from "@/lib/actions/billing";
import type { AdminPaymentRequest } from "@/lib/data";
import { PLAN_NAME, formatBdt } from "@/lib/plans";
import { formatDateTime } from "@/lib/utils";
import { PAYMENT_LABEL, PAYMENT_TONE } from "./billing-view";

export function PaymentReview({ payments }: { payments: AdminPaymentRequest[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<AdminPaymentRequest | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function decide(approve: boolean) {
    if (!open) return;
    start(async () => {
      const res = await reviewPayment({ id: open.id, approve, note });
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : res.error });
      if (res.ok) {
        setOpen(null);
        router.refresh();
      }
    });
  }

  if (payments.length === 0) return <EmptyState title="No payments to review" description="bKash payments submitted by companies appear here." />;

  return (
    <>
      {message && !open && <Notice tone={message.ok ? "success" : "error"} className="mb-4">{message.text}</Notice>}
      <Card className="p-2.5">
        <Table>
          <thead>
            <tr><Th>Submitted</Th><Th>Company</Th><Th>Plan</Th><Th right>Amount</Th><Th>Paid from</Th><Th>TrxID</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <Tr key={p.id}>
                <Td>{formatDateTime(p.createdAt)}</Td>
                <Td className="font-medium">{p.companyName}</Td>
                <Td>{PLAN_NAME[p.plan] ?? p.plan}</Td>
                <Td right>{formatBdt(p.amountBdt)}</Td>
                <Td className="tabular-nums">{p.senderNumber}</Td>
                <Td className="tabular-nums">{p.trxId}</Td>
                <Td><Badge tone={PAYMENT_TONE[p.status]} dot>{PAYMENT_LABEL[p.status]}</Badge></Td>
                <Td right>
                  {p.status === "pending" && (
                    <Button size="sm" variant="secondary" onClick={() => { setOpen(p); setNote(""); setMessage(null); }}>Review</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Review bKash payment">
        {open && (
          <div className="space-y-4">
            <dl className="divide-y divide-border rounded-control border border-border text-[13px]">
              {[
                ["Company", open.companyName],
                ["Plan", PLAN_NAME[open.plan] ?? open.plan],
                ["Amount expected", formatBdt(open.amountBdt)],
                ["Paid from", open.senderNumber],
                ["TrxID", open.trxId],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-secondary">{k}</dt>
                  <dd className="font-medium text-ink tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Notice tone="warning">Approve only after you find this TrxID, amount and sender in the bKash statement. Approving activates the plan for 30 days.</Notice>
            <Field label="Note to the company" htmlFor="review-note" hint="Required when rejecting.">
              <Textarea id="review-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </Field>
            {message && !message.ok && <Notice tone="error">{message.text}</Notice>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => decide(false)} disabled={pending}>Reject</Button>
              <Button onClick={() => decide(true)} loading={pending}>Approve and activate</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
