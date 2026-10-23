"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { FileText, Loader2, Mail, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useUploader } from "@/components/documents/use-uploader";
import { extractDocument, extractEmailText } from "@/lib/actions/documents";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES, formatBytes, validateEmailText, validateUpload } from "@/lib/upload-rules";

type Mode = "file" | "email";

type Kind = "purchase_order" | "tech_pack";

/**
 * Screen 09. Live mode: upload to private storage → AI extraction → review.
 * Demo mode: validates the input and explains that nothing is processed.
 */
export function UploadPanel({ live }: { live: boolean }) {
  const router = useRouter();
  const uploader = useUploader();
  const [kind, setKind] = useState<Kind>("purchase_order");
  const [step, setStep] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [emailText, setEmailText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(f: File | undefined) {
    setAttempted(false);
    if (!f) return;
    const problem = validateUpload(f);
    setError(problem);
    setFile(problem ? null : f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files[0]);
  }

  function submit() {
    const problem = mode === "file" ? (file ? null : "Choose a document to upload.") : validateEmailText(emailText);
    setError(problem);
    if (problem) return;
    if (!live) return setAttempted(true);
    startBusy(async () => {
      let jobId: string | undefined;
      if (mode === "file" && file) {
        setStep("Uploading to your private storage…");
        const documentId = await uploader.upload(file, kind);
        if (!documentId) return (setError(uploader.error ?? "Upload failed."), setStep(null));
        setStep("Reading the document with AI… this usually takes 10–40 seconds.");
        const res = await extractDocument(documentId);
        if (!res.ok) return (setError(`${res.error} The document is saved in the document center.`), setStep(null));
        jobId = res.data;
      } else {
        setStep("Reading the email with AI…");
        const res = await extractEmailText(emailText);
        if (!res.ok) return (setError(res.error), setStep(null));
        jobId = res.data;
      }
      setStep("Opening the review screen…");
      router.push(`/orders/review/${jobId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <Card>
        <div className="flex gap-1 border-b border-border px-5 pt-4" role="tablist" aria-label="Input type">
          {(
            [
              ["file", "Upload document", FileText],
              ["email", "Paste buyer email", Mail],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={mode === value}
              onClick={() => { setMode(value); setError(null); setAttempted(false); }}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-[13px] font-medium",
                mode === value ? "border-violet text-violet" : "border-transparent text-secondary hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <CardBody className="space-y-5">
          {mode === "file" ? (
            file ? (
              <div className="flex items-center gap-3 rounded-card border border-border bg-subtle p-4">
                <div className="grid size-10 place-items-center rounded-control bg-violet-light text-violet">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{file.name}</p>
                  <p className="text-caption text-secondary">
                    {ACCEPTED_TYPES[file.type]} · {formatBytes(file.size)} · ready for processing
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setAttempted(false); }} icon={<Trash2 className="size-4" />}>
                  Remove
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging ? "border-violet bg-violet-light/60" : "border-border bg-subtle",
                )}
              >
                <div className="grid size-12 place-items-center rounded-full bg-surface text-violet shadow-card">
                  <UploadCloud className="size-6" />
                </div>
                <p className="mt-4 text-[15px] font-semibold">Drag a buyer PO or tech pack here</p>
                <p className="mt-1 text-caption text-secondary">PDF, PNG or JPEG · up to 10 MB</p>
                <Button variant="secondary" className="mt-5" onClick={() => inputRef.current?.click()}>Browse files</Button>
                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  accept={Object.keys(ACCEPTED_TYPES).join(",")}
                  onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }}
                  aria-label="Choose document"
                />
              </div>
            )
          ) : (
            <Field label="Buyer email" htmlFor="email-text" hint={`${emailText.trim().length} characters`}>
              <Textarea
                id="email-text"
                value={emailText}
                onChange={(e) => { setEmailText(e.target.value); setAttempted(false); }}
                placeholder={"Paste the buyer's email including PO number, style, quantities, colours, sizes and shipment date…"}
                className="min-h-64"
              />
            </Field>
          )}

          {mode === "file" && (
            <div className="flex flex-wrap items-center gap-4 text-[13px]" role="radiogroup" aria-label="Document type">
              {([["purchase_order", "Purchase order"], ["tech_pack", "Tech pack"]] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="kind" checked={kind === v} onChange={() => setKind(v)} className="accent-violet" /> {l}
                </label>
              ))}
            </div>
          )}

          {step && (
            <div className="flex items-center gap-3 rounded-control border border-violet/20 bg-violet-light px-4 py-3 text-[13px] text-violet" role="status">
              <Loader2 className="size-4 animate-spin" /> {step}
            </div>
          )}

          {error && <Notice tone="error" title="Unable to use this input">{error}</Notice>}

          {attempted && (
            <Notice tone="warning" title="Demo mode: nothing was uploaded">
              Your input passed validation, but the demo does not upload files or call AI. Create a workspace to use real extraction, or preview the{" "}
              <Link href="/orders/review/sample" className="font-semibold underline">review screen with a sample document</Link>.
            </Notice>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <ButtonLink href="/orders/review/sample" variant="ghost">Preview sample review</ButtonLink>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/orders/create" variant="secondary">Enter manually</ButtonLink>
              <Button onClick={submit} loading={busy}>Extract order details</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="h-fit">
        <CardHeader title="What happens next" />
        <CardBody>
          <ol className="space-y-4 text-[13px]">
            {[
              ["Stored privately", "Files go to your company's private storage. Only your team can open them."],
              ["AI suggests fields", "Buyer, PO, style, fabric, GSM, quantities, colour/size breakdown and ship date."],
              ["You review", "Every value shows its source line. Missing values are flagged — never guessed."],
              ["You approve", "Only approved information becomes a purchase order."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-light text-[11px] font-semibold text-violet">{i + 1}</span>
                <span>
                  <span className="font-semibold">{title}</span>
                  <span className="block text-secondary">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex gap-2 rounded-control bg-subtle p-3 text-caption text-secondary">
            <ShieldCheck className="size-4 shrink-0 text-green" /> Only upload documents your company is authorised to process.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
