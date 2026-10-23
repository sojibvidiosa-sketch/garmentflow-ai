"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Quote, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import { BreakdownEditor } from "./breakdown-editor";
import { approveExtraction, rejectExtraction } from "@/lib/actions/documents";
import type { ReviewExtraction, ReviewField } from "@/lib/ai/extraction";
import type { PoInput } from "@/lib/validation/po";
import { cn, formatNumber } from "@/lib/utils";

const REQUIRED = new Set(["buyer", "poNumber", "styleNo", "quantity", "shipDate"]);

function confidenceBadge(f: ReviewField, value: string) {
  if (!value.trim()) return <Badge tone="red">Missing</Badge>;
  if (value !== f.value) return <Badge tone="violet">Edited</Badge>;
  if (f.confidence >= 0.9) return <Badge tone="green">High confidence</Badge>;
  return <Badge tone="yellow">Please check</Badge>;
}

function validate(key: string, value: string): string | undefined {
  const v = value.trim();
  if (REQUIRED.has(key) && !v) return "Required. Confirm this value with the buyer before approving.";
  if ((key === "quantity" || key === "gsm") && v && !/^\d+$/.test(v)) return "Enter a whole number.";
  if (key === "unitPrice" && v && !/^\d+(\.\d{1,4})?$/.test(v)) return "Enter a price such as 6.40.";
  if (key === "shipDate" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Enter a valid date.";
  return undefined;
}

/**
 * Screen 10. `jobId` is null for the built-in sample (demo); otherwise
 * approving creates the order through the server.
 */
export function ReviewWorkspace({ extraction, jobId, buyers = [] }: { extraction: ReviewExtraction; jobId: string | null; buyers?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(extraction.fields.map((f) => [f.key, f.value])));
  const [colors, setColors] = useState(extraction.colors);
  const [instructions, setInstructions] = useState(extraction.specialInstructions);
  const [focused, setFocused] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [createPlan, setCreatePlan] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const errors = useMemo(
    () => Object.fromEntries(extraction.fields.map((f) => [f.key, validate(f.key, values[f.key] ?? "")]).filter(([, e]) => e)) as Record<string, string>,
    [extraction.fields, values],
  );
  const breakdownTotal = colors.reduce((sum, c) => sum + c.sizes.reduce((s, x) => s + x.qty, 0), 0);
  const statedTotal = Number(values.quantity || 0);
  const mismatch = statedTotal > 0 && breakdownTotal > 0 && breakdownTotal !== statedTotal;
  const unnamedColor = colors.some((c) => !c.color.trim());
  const errorCount = Object.keys(errors).length + (unnamedColor && breakdownTotal > 0 ? 1 : 0);
  const matchedBuyer = buyers.find((b) => b.name.toLowerCase() === (values.buyer ?? "").trim().toLowerCase());

  const source = extraction.fields.find((f) => f.key === focused)?.source;
  const highlighted = useMemo(() => {
    const text = extraction.sourceText;
    if (!source || !text) return [text];
    const needle = source.split(" — ")[0]!;
    const i = text.indexOf(needle);
    return i < 0 ? [text] : [text.slice(0, i), text.slice(i, i + needle.length), text.slice(i + needle.length)];
  }, [extraction.sourceText, source]);

  function toPoInput(): PoInput {
    const price = values.unitPrice?.trim();
    return {
      poNumber: values.poNumber ?? "",
      buyerId: matchedBuyer?.id ?? "",
      season: "",
      status: "confirmed",
      orderDate: "",
      shipDate: values.shipDate ?? "",
      currency: extraction.currency,
      unitPrice: price ? Number(price) : null,
      merchandiserId: "",
      notes: "Created from an AI-extracted document after merchandiser review.",
      specialInstructions: instructions,
      items: [
        {
          styleNo: values.styleNo ?? "",
          description: values.description ?? "",
          fabric: values.fabric ?? "",
          gsm: values.gsm ? Number(values.gsm) : null,
          colors: breakdownTotal > 0 ? colors : [],
        },
        ...extraction.extraItems.map((i) => ({ ...i, styleNo: i.styleNo || "Unnamed style" })),
      ],
    };
  }

  function approve() {
    setShowErrors(true);
    setServerError(null);
    if (errorCount > 0 || !confirmed) return;
    if (!jobId) return setDemoDone(true);
    start(async () => {
      const res = await approveExtraction(jobId, toPoInput(), values.buyer ?? "", createPlan);
      if (!res.ok) return setServerError(res.error);
      router.push(`/orders/${res.data}`);
    });
  }

  function discard() {
    if (!jobId) return;
    start(async () => {
      const res = await rejectExtraction(jobId);
      if (!res.ok) return setServerError(res.error);
      router.push("/documents");
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card className="xl:sticky xl:top-[101px] xl:h-fit">
        <CardHeader
          title="Original document"
          description={extraction.fileName}
          action={
            extraction.documentUrl && (
              <a href={extraction.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-caption font-semibold text-violet hover:underline">
                Open <ExternalLink className="size-3.5" />
              </a>
            )
          }
        />
        <CardBody>
          {extraction.sourceText ? (
            <pre className="max-h-[640px] overflow-auto rounded-control bg-subtle p-5 font-sans text-[13px] leading-7 whitespace-pre-wrap text-ink">
              {highlighted.length === 3 ? (
                <>
                  {highlighted[0]}
                  <mark className="rounded bg-yellow-light px-0.5 text-ink ring-2 ring-yellow/40">{highlighted[1]}</mark>
                  {highlighted[2]}
                </>
              ) : (
                highlighted[0]
              )}
            </pre>
          ) : extraction.documentUrl ? (
            <iframe src={extraction.documentUrl} title="Original document" className="h-[640px] w-full rounded-control border border-border bg-subtle" />
          ) : (
            <p className="text-[13px] text-secondary">The original file is not available.</p>
          )}
          <p className="mt-3 text-caption text-secondary">
            {extraction.sourceText ? "Select a field on the right to highlight where it came from." : "Each field shows the quote the AI found it in."}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Review extracted information"
          action={errorCount ? <Badge tone="yellow">{errorCount} to resolve</Badge> : <Badge tone="green">Ready to approve</Badge>}
        />
        <CardBody className="space-y-6">
          {extraction.missing.length > 0 && (
            <Notice tone="warning" title="Information missing from the document">
              <ul className="list-disc pl-4">
                {extraction.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </Notice>
          )}

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {extraction.fields.map((f) => {
              const value = values[f.key] ?? "";
              const error = showErrors || value !== f.value ? errors[f.key] : undefined;
              return (
                <Field
                  key={f.key}
                  htmlFor={`f-${f.key}`}
                  required={REQUIRED.has(f.key)}
                  error={error}
                  className={cn(f.key === "description" || f.key === "fabric" ? "sm:col-span-2" : "")}
                  label={f.label}
                  aside={confidenceBadge(f, value)}
                  hint={
                    f.key === "buyer" && jobId && value.trim() ? (
                      matchedBuyer ? "Matches an existing buyer." : "New buyer: it will be added to your buyer directory."
                    ) : (
                      f.source && <span className="flex items-start gap-1.5"><Quote className="mt-0.5 size-3 shrink-0" />{f.source}</span>
                    )
                  }
                >
                  <Input
                    id={`f-${f.key}`}
                    type={f.key === "shipDate" ? "date" : "text"}
                    inputMode={f.key === "quantity" || f.key === "gsm" ? "numeric" : undefined}
                    value={value}
                    onFocus={() => setFocused(f.key)}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    aria-invalid={!!error}
                    className={cn(!value.trim() && "border-red/50 bg-red-light/40")}
                  />
                </Field>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-caption font-medium text-secondary">Colour / size breakdown (pcs)</p>
            <BreakdownEditor idPrefix="review" colors={colors} onChange={setColors} />
            {mismatch && (
              <p className="mt-2 flex items-center gap-1.5 text-caption text-red">
                <AlertTriangle className="size-3.5" /> Breakdown total ({formatNumber(breakdownTotal)}) does not match the stated quantity ({formatNumber(statedTotal)}).
              </p>
            )}
            {unnamedColor && breakdownTotal > 0 && showErrors && <p className="mt-2 text-caption text-red">Name every colour in the breakdown.</p>}
          </div>

          {extraction.extraItems.length > 0 && (
            <Notice tone="info" title={`${extraction.extraItems.length} more style${extraction.extraItems.length > 1 ? "s" : ""} found`}>
              {extraction.extraItems.map((i) => i.styleNo || "Unnamed style").join(", ")} will be added to the same order. Review them on the order page after approving.
            </Notice>
          )}

          <Field label="Special instructions" htmlFor="instructions">
            <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>

          <div className="space-y-2 rounded-control border border-border bg-subtle p-3 text-[13px]">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-violet" />
              <span>
                I have checked these values against the original document.
                {showErrors && !confirmed && <span className="mt-1 block text-caption text-red">Please confirm before approving.</span>}
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={createPlan} onChange={(e) => setCreatePlan(e.target.checked)} className="mt-0.5 size-4 accent-violet" />
              <span>Create a T&A plan from the standard template</span>
            </label>
          </div>

          {showErrors && errorCount > 0 && (
            <Notice tone="error" title={`${errorCount} field${errorCount > 1 ? "s" : ""} need attention`}>
              Resolve the highlighted fields. Missing commercial values must come from the buyer, never from AI guesses.
            </Notice>
          )}
          {serverError && <Notice tone="error">{serverError}</Notice>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            {jobId && <Button variant="ghost" icon={<XCircle className="size-4" />} onClick={discard} disabled={pending}>Discard</Button>}
            <Button variant="secondary" onClick={() => { setValues(Object.fromEntries(extraction.fields.map((f) => [f.key, f.value]))); setColors(extraction.colors); setShowErrors(false); }}>
              Reset to AI suggestions
            </Button>
            <Button onClick={approve} loading={pending} icon={<CheckCircle2 className="size-4" />}>Approve and create order</Button>
          </div>
        </CardBody>
      </Card>

      <Modal open={demoDone} onClose={() => setDemoDone(false)} title="Review complete (demo)" footer={<Button onClick={() => setDemoDone(false)}>Close</Button>}>
        <p>
          All required fields passed validation. This is the built-in sample, so <strong className="text-ink">no purchase order was created</strong>. In your own workspace, approving saves{" "}
          <strong className="text-ink">{values.poNumber}</strong>, records who approved it, and keeps the original document linked.
        </p>
      </Modal>
    </div>
  );
}
