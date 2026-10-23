"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import type { ColorBreakdown } from "@/lib/domain/types";
import { cn, formatNumber } from "@/lib/utils";

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: string;
}

interface Extraction {
  fileName: string;
  sourceText: string;
  fields: ExtractedField[];
  colors: ColorBreakdown[];
  specialInstructions: string;
  missing: string[];
}

const REQUIRED = new Set(["buyer", "poNumber", "styleNo", "quantity", "shipDate"]);

function confidenceBadge(f: ExtractedField, value: string) {
  if (!value.trim()) return <Badge tone="red">Missing</Badge>;
  if (value !== f.value) return <Badge tone="violet">Edited</Badge>;
  if (f.confidence >= 0.9) return <Badge tone="green">High confidence</Badge>;
  return <Badge tone="yellow">Please check</Badge>;
}

function validate(key: string, value: string): string | undefined {
  const v = value.trim();
  if (REQUIRED.has(key) && !v) return "Required — confirm this value with the buyer before approving.";
  if ((key === "quantity" || key === "gsm") && v && !/^\d+$/.test(v)) return "Enter a whole number.";
  if (key === "unitPrice" && v && !/^\d+(\.\d{1,4})?$/.test(v)) return "Enter a price such as 6.40.";
  if (key === "shipDate" && v && Number.isNaN(Date.parse(v))) return "Enter a valid date.";
  return undefined;
}

export function ReviewWorkspace({ extraction }: { extraction: Extraction }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(extraction.fields.map((f) => [f.key, f.value])));
  const [colors, setColors] = useState(extraction.colors);
  const [instructions, setInstructions] = useState(extraction.specialInstructions);
  const [focused, setFocused] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [approved, setApproved] = useState(false);

  const errors = useMemo(
    () => Object.fromEntries(extraction.fields.map((f) => [f.key, validate(f.key, values[f.key] ?? "")]).filter(([, e]) => e)) as Record<string, string>,
    [extraction.fields, values],
  );
  const sizes = colors[0]?.sizes.map((s) => s.size) ?? [];
  const breakdownTotal = colors.reduce((sum, c) => sum + c.sizes.reduce((s, x) => s + x.qty, 0), 0);
  const statedTotal = Number(values.quantity || 0);
  const mismatch = statedTotal > 0 && breakdownTotal !== statedTotal;
  const errorCount = Object.keys(errors).length;

  const source = extraction.fields.find((f) => f.key === focused)?.source;
  const highlighted = useMemo(() => {
    const text = extraction.sourceText;
    if (!source) return [text];
    // Highlight the longest prefix of the cited source line found in the document.
    const needle = source.split(" — ")[0]!;
    const i = text.indexOf(needle);
    return i < 0 ? [text] : [text.slice(0, i), text.slice(i, i + needle.length), text.slice(i + needle.length)];
  }, [extraction.sourceText, source]);

  function setQty(ci: number, si: number, qty: number) {
    setColors((cs) => cs.map((c, i) => (i !== ci ? c : { ...c, sizes: c.sizes.map((s, j) => (j === si ? { ...s, qty } : s)) })));
  }

  function approve() {
    setShowErrors(true);
    if (errorCount === 0 && confirmed) setApproved(true);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card className="xl:sticky xl:top-[101px] xl:h-fit">
        <CardHeader title="Original document" description={extraction.fileName} />
        <CardBody>
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
          <p className="mt-3 text-caption text-secondary">Select a field on the right to highlight where it came from.</p>
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
                    f.source && (
                      <span className="flex items-start gap-1.5"><Quote className="mt-0.5 size-3 shrink-0" />{f.source}</span>
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
            <div className="mb-2 flex items-center justify-between">
              <p className="text-caption font-medium text-secondary">Colour / size breakdown (pcs)</p>
              <p className={cn("text-caption font-semibold tabular-nums", mismatch ? "text-red" : "text-green")}>
                Total {formatNumber(breakdownTotal)}
              </p>
            </div>
            <div className="overflow-x-auto rounded-control border border-border">
              <div className="grid min-w-[420px]" style={{ gridTemplateColumns: `120px repeat(${sizes.length}, 1fr) 80px` }}>
                <div className="bg-subtle px-3 py-2 text-[11px] font-semibold text-secondary uppercase">Colour</div>
                {sizes.map((s) => <div key={s} className="bg-subtle px-3 py-2 text-[11px] font-semibold text-secondary">{s}</div>)}
                <div className="bg-subtle px-3 py-2 text-right text-[11px] font-semibold text-secondary">Total</div>
                {colors.map((c, ci) => (
                  <Fragment key={c.color}>
                    <div className="border-t border-border px-3 py-2 text-[13px] font-medium">{c.color}</div>
                    {c.sizes.map((s, si) => (
                      <div key={s.size} className="border-t border-border px-1.5 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={s.qty}
                          onChange={(e) => setQty(ci, si, Math.max(0, Number(e.target.value) || 0))}
                          aria-label={`${c.color} ${s.size} quantity`}
                          className="h-8 w-full rounded-md border border-transparent px-1.5 text-[13px] tabular-nums hover:border-border focus:border-violet focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="border-t border-border px-3 py-2 text-right text-[13px] font-semibold tabular-nums">
                      {formatNumber(c.sizes.reduce((sum, s) => sum + s.qty, 0))}
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
            {mismatch && (
              <p className="mt-2 flex items-center gap-1.5 text-caption text-red">
                <AlertTriangle className="size-3.5" /> Breakdown total ({formatNumber(breakdownTotal)}) does not match the stated quantity ({formatNumber(statedTotal)}).
              </p>
            )}
          </div>

          <Field label="Special instructions" htmlFor="instructions">
            <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>

          <label className="flex items-start gap-3 rounded-control border border-border bg-subtle p-3 text-[13px]">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-violet" />
            <span>
              I have checked these values against the original document.
              {showErrors && !confirmed && <span className="mt-1 block text-caption text-red">Please confirm before approving.</span>}
            </span>
          </label>

          {showErrors && errorCount > 0 && (
            <Notice tone="error" title={`${errorCount} field${errorCount > 1 ? "s" : ""} need attention`}>
              Resolve the highlighted fields. Missing commercial values must come from the buyer — never from AI guesses.
            </Notice>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            <Button variant="secondary" onClick={() => { setValues(Object.fromEntries(extraction.fields.map((f) => [f.key, f.value]))); setColors(extraction.colors); setShowErrors(false); }}>
              Reset to AI suggestions
            </Button>
            <Button onClick={approve} icon={<CheckCircle2 className="size-4" />}>Approve and create order</Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={approved}
        onClose={() => setApproved(false)}
        title="Review complete — demo only"
        footer={<Button onClick={() => setApproved(false)}>Close</Button>}
      >
        <p>
          All required fields passed validation. In demo mode <strong className="text-ink">no purchase order was created</strong>. From Phase 4, approving here saves{" "}
          <strong className="text-ink">{values.poNumber}</strong> to your company workspace, records who approved it, and keeps the original document linked.
        </p>
      </Modal>
    </div>
  );
}
