"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, FilePlus2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { deleteEmailDraft, generateEmailDraft, saveEmailDraft } from "@/lib/actions/ai";
import type { EmailDraftRow } from "@/lib/data";
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
import { cn, formatDateTime } from "@/lib/utils";

export interface ComposerOrder {
  id: string;
  context: EmailContext;
}

type Origin = "template" | "ai" | "draft" | null;

export function EmailComposer({ orders, drafts, live, aiEnabled }: { orders: ComposerOrder[]; drafts: EmailDraftRow[]; live: boolean; aiEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = orders.some((o) => o.id === params.get("po")) ? params.get("po")! : (orders[0]?.id ?? "");
  const [poId, setPoId] = useState(initial);
  const [purpose, setPurpose] = useState<EmailPurpose>("sample_followup");
  const [recipient, setRecipient] = useState<Recipient>("buyer");
  const [tone, setTone] = useState<EmailTone>("formal");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [origin, setOrigin] = useState<Origin>(null);
  const [draftId, setDraftId] = useState("");
  const [aiJobId, setAiJobId] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();

  const order = orders.find((o) => o.id === poId);
  const poNumber = new Map(orders.map((o) => [o.id, o.context.poNumber]));

  function insertTemplate() {
    if (!order) return;
    const t = buildTemplate(purpose, recipient, tone, order.context, notes);
    setSubject(t.subject);
    setBody(t.body);
    setOrigin("template");
    setAiJobId("");
    setMessage(null);
  }

  function generate() {
    if (!order) return;
    setMessage(null);
    startGenerate(async () => {
      const res = await generateEmailDraft({ poId: order.id, purpose, recipient, tone, notes });
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setSubject(res.data!.subject);
      setBody(res.data!.body);
      setAiJobId(res.data!.jobId);
      setOrigin("ai");
    });
  }

  function save() {
    setMessage(null);
    startSave(async () => {
      const res = await saveEmailDraft({ id: draftId, poId, purpose, recipient, tone, subject, body, aiJobId });
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setDraftId(res.data!);
      setMessage({ tone: "success", text: "Draft saved." });
      router.refresh();
    });
  }

  function load(d: EmailDraftRow) {
    setDraftId(d.id);
    if (d.poId && orders.some((o) => o.id === d.poId)) setPoId(d.poId);
    if (d.purpose in PURPOSE_LABEL) setPurpose(d.purpose as EmailPurpose);
    if (d.recipient in RECIPIENT_LABEL) setRecipient(d.recipient as Recipient);
    if (d.tone in TONE_LABEL) setTone(d.tone as EmailTone);
    setSubject(d.subject);
    setBody(d.body);
    setAiJobId(d.aiJobId ?? "");
    setOrigin("draft");
    setMessage(null);
  }

  function startNew() {
    setDraftId("");
    setSubject("");
    setBody("");
    setAiJobId("");
    setOrigin(null);
    setMessage(null);
  }

  function remove(id: string) {
    startSave(async () => {
      const res = await deleteEmailDraft(id);
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      if (id === draftId) startNew();
      router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: "error", text: "Your browser blocked clipboard access. Select the text and copy it manually." });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader title="Email details" />
          <CardBody className="space-y-4">
            {orders.length === 0 && <Notice tone="info">Create or approve a purchase order first. Emails are written from approved order data only.</Notice>}
            <Field label="Purchase order" htmlFor="po">
              <Select id="po" value={poId} onChange={(e) => setPoId(e.target.value)}>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.context.poNumber} · {o.context.buyerName}</option>)}
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
              <Button
                className="w-full"
                onClick={generate}
                loading={generating}
                disabled={!order || !live || !aiEnabled}
                title={!live ? "Available in your own workspace" : !aiEnabled ? "AI is not switched on yet" : undefined}
                icon={<Sparkles className="size-4" />}
              >
                Generate with AI
              </Button>
              <Button variant="secondary" className="w-full" onClick={insertTemplate} disabled={!order} icon={<Wand2 className="size-4" />}>
                Insert standard template
              </Button>
              <p className="text-caption text-secondary">
                {!live ? "AI drafting works in your own workspace. Templates use only approved order data." : !aiEnabled ? "AI drafting is switched off until an OpenAI key is added. Templates still work." : "AI writes from approved order facts only. Always read before sending."}
              </p>
            </div>
          </CardBody>
        </Card>

        {live && (
          <Card>
            <CardHeader title="Saved drafts" action={<Button variant="ghost" size="sm" icon={<FilePlus2 className="size-4" />} onClick={startNew}>New</Button>} />
            <CardBody className="pt-3">
              {drafts.length === 0 ? (
                <p className="text-[13px] text-secondary">No saved drafts yet.</p>
              ) : (
                <ul className="space-y-1">
                  {drafts.map((d) => (
                    <li key={d.id} className={cn("flex items-start gap-2 rounded-control px-2 py-2", d.id === draftId && "bg-violet-light")}>
                      <button type="button" onClick={() => load(d)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[13px] font-medium">{d.subject}</span>
                        <span className="text-caption text-secondary">
                          {d.poId ? (poNumber.get(d.poId) ?? "Order") : "No order"} · {formatDateTime(d.updatedAt)}
                        </span>
                      </button>
                      <button type="button" onClick={() => remove(d.id)} className="rounded p-1 text-muted hover:text-red" aria-label={`Delete draft ${d.subject}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader
          title={draftId ? "Edit draft" : "Draft"}
          action={
            origin === "ai" ? <Badge tone="violet">AI draft: check before sending</Badge> : origin === "template" ? <Badge tone="neutral">Standard template, not AI-generated</Badge> : undefined
          }
        />
        <CardBody className="space-y-4">
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </Field>
          <Field label="Message" htmlFor="body">
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[360px]" placeholder="Choose the email details, then generate a draft or insert a template, or write your own message." />
          </Field>
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={save} loading={saving} disabled={!live || !subject.trim() || !body.trim()} title={!live ? "Saving works in your own workspace" : undefined} icon={<Save className="size-4" />}>
              {draftId ? "Save changes" : "Save draft"}
            </Button>
            <Button onClick={copy} disabled={!body.trim()} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
              {copied ? "Copied" : "Copy email"}
            </Button>
          </div>
          <p className="text-right text-caption text-secondary">GarmentFlow never sends emails automatically. Paste the draft into your own email client.</p>
        </CardBody>
      </Card>
    </div>
  );
}
