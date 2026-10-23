"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Save, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import {
  buildTemplate,
  PURPOSE_LABEL,
  RECIPIENT_LABEL,
  TONE_LABEL,
  type EmailContext,
  type EmailPurpose,
  type EmailTone,
  type Recipient,
} from "@/lib/email-templates";

export interface ComposerOrder {
  id: string;
  context: EmailContext;
}

export function EmailComposer({ orders }: { orders: ComposerOrder[] }) {
  const params = useSearchParams();
  const initial = orders.some((o) => o.id === params.get("po")) ? params.get("po")! : (orders[0]?.id ?? "");
  const [poId, setPoId] = useState(initial);
  const [purpose, setPurpose] = useState<EmailPurpose>("sample_followup");
  const [recipient, setRecipient] = useState<Recipient>("buyer");
  const [tone, setTone] = useState<EmailTone>("formal");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromTemplate, setFromTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const order = orders.find((o) => o.id === poId);

  function insertTemplate() {
    if (!order) return;
    const t = buildTemplate(purpose, recipient, tone, order.context, notes);
    setSubject(t.subject);
    setBody(t.body);
    setFromTemplate(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader title="Email details" />
        <CardBody className="space-y-4">
          <Field label="Purchase order" htmlFor="po">
            <Select id="po" value={poId} onChange={(e) => setPoId(e.target.value)}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.context.poNumber} · {o.context.buyerName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Purpose" htmlFor="purpose">
            <Select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as EmailPurpose)}>
              {Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recipient" htmlFor="recipient">
              <Select id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value as Recipient)}>
                {Object.entries(RECIPIENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Tone" htmlFor="tone">
              <Select id="tone" value={tone} onChange={(e) => setTone(e.target.value as EmailTone)}>
                {Object.entries(TONE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Extra points to include (optional)" htmlFor="notes">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Ask for courier tracking number" />
          </Field>

          {order && (
            <div className="rounded-control bg-subtle p-3 text-caption text-secondary">
              <p className="mb-1 font-semibold text-ink">Order facts used</p>
              {order.context.styleNo} · {order.context.description} · {order.context.quantity} pcs · ships {order.context.shipDate}
              {order.context.nextMilestone && <> · next: {order.context.nextMilestone}</>}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button className="w-full" disabled title="OpenAI drafting is connected in Phase 7" icon={<Sparkles className="size-4" />}>
              Generate with AI
            </Button>
            <Button variant="secondary" className="w-full" onClick={insertTemplate} disabled={!order} icon={<Wand2 className="size-4" />}>
              Insert standard template
            </Button>
            <p className="text-caption text-secondary">AI drafting is connected in Phase 7. Templates use only approved order data.</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Draft"
          action={fromTemplate ? <Badge tone="neutral">Standard template — not AI-generated</Badge> : undefined}
        />
        <CardBody className="space-y-4">
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </Field>
          <Field label="Message" htmlFor="body">
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[360px]" placeholder="Choose the email details, then insert a template — or write your own message." />
          </Field>
          {copyError && <Notice tone="error">Your browser blocked clipboard access. Select the text and copy it manually.</Notice>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" disabled title="Saving drafts requires the database (Phase 7)" icon={<Save className="size-4" />}>Save draft</Button>
            <Button onClick={copy} disabled={!body.trim()} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
              {copied ? "Copied" : "Copy email"}
            </Button>
          </div>
          <p className="text-right text-caption text-secondary">GarmentFlow never sends emails automatically — paste the draft into your own email client.</p>
        </CardBody>
      </Card>
    </div>
  );
}
