"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, Search, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Notice } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useUploader } from "./use-uploader";
import { deleteDocument, extractDocument, getDocumentLink } from "@/lib/actions/documents";
import type { DocumentRow } from "@/lib/data";
import { ACCEPTED_TYPES, formatBytes, validateUpload } from "@/lib/upload-rules";
import { formatDateTime } from "@/lib/utils";

const KIND_LABEL: Record<DocumentRow["kind"], string> = {
  purchase_order: "Purchase order",
  tech_pack: "Tech pack",
  buyer_email: "Buyer email",
  other: "Other",
};

type Kind = DocumentRow["kind"];

export function DocumentCenter({ documents, orders, canDelete }: { documents: DocumentRow[]; orders: { id: string; poNumber: string }[]; canDelete: boolean }) {
  const router = useRouter();
  const uploader = useUploader();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"" | Kind>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind>("purchase_order");
  const [poId, setPoId] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return documents.filter((d) => (!kindFilter || d.kind === kindFilter) && (!n || `${d.fileName} ${d.poNumber ?? ""}`.toLowerCase().includes(n)));
  }, [documents, q, kindFilter]);

  function open(doc: DocumentRow) {
    setBusyId(doc.id);
    start(async () => {
      const res = await getDocumentLink(doc.id);
      setBusyId(null);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      window.open(res.data, "_blank", "noopener");
    });
  }

  function extract(doc: DocumentRow) {
    setBusyId(doc.id);
    setMessage({ ok: true, text: `Reading ${doc.fileName} with AI… this usually takes 10–40 seconds.` });
    start(async () => {
      const res = await extractDocument(doc.id);
      setBusyId(null);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      router.push(`/orders/review/${res.data}`);
    });
  }

  function upload() {
    if (!file) return setFileError("Choose a file.");
    start(async () => {
      const id = await uploader.upload(file, kind, poId || null);
      if (!id) return setFileError(uploader.error ?? "Upload failed.");
      setUploadOpen(false);
      setFile(null);
      setMessage({ ok: true, text: `${file.name} uploaded.` });
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;
    start(async () => {
      const res = await deleteDocument(deleting.id);
      setDeleting(null);
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Deleted.") : res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file name or PO" aria-label="Search documents" className="pl-9" />
        </div>
        <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as "" | Kind)} aria-label="Filter by type" className="sm:w-44">
          <option value="">All types</option>
          {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Button className="sm:ml-auto" icon={<UploadCloud className="size-4" />} onClick={() => { setFileError(null); setUploadOpen(true); }}>
          Upload document
        </Button>
      </div>
      {message && <Notice tone={message.ok ? "info" : "error"} className="mb-4">{message.text}</Notice>}

      <Card className="p-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title={documents.length ? "No documents match" : "No documents yet"}
            description={documents.length ? "Try another search or type." : "Upload buyer POs and tech packs. They are stored privately for your company."}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Order</Th>
                <Th>AI extraction</Th>
                <Th>Uploaded</Th>
                <Th className="w-44"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      {d.fileName.toLowerCase().endsWith(".pdf") ? <FileText className="size-4 shrink-0 text-violet" /> : <ImageIcon className="size-4 shrink-0 text-violet" />}
                      <span className="min-w-0">
                        <span className="block max-w-[260px] truncate font-medium">{d.fileName}</span>
                        <span className="text-caption text-secondary">{formatBytes(d.sizeBytes)}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>{KIND_LABEL[d.kind]}</Td>
                  <Td>{d.poId ? <Link href={`/orders/${d.poId}`} className="font-medium text-violet hover:underline">{d.poNumber}</Link> : <span className="text-secondary">Not linked</span>}</Td>
                  <Td>
                    {d.extraction?.status === "approved" ? (
                      <Badge tone="green">Approved</Badge>
                    ) : d.extraction?.status === "needs_review" ? (
                      <Link href={`/orders/review/${d.extraction.jobId}`}><Badge tone="yellow">Needs review</Badge></Link>
                    ) : d.lastJobFailed ? (
                      <Badge tone="red">Failed</Badge>
                    ) : (
                      <Badge tone="neutral">Not read</Badge>
                    )}
                  </Td>
                  <Td className="text-secondary">
                    {formatDateTime(d.uploadedAt)}
                    <span className="block text-caption">{d.uploadedBy}</span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      {busyId === d.id && <Loader2 className="m-1.5 size-4 animate-spin text-violet" />}
                      {!d.extraction && (d.kind === "purchase_order" || d.kind === "tech_pack") && (
                        <Button variant="ghost" size="sm" icon={<Sparkles className="size-3.5" />} onClick={() => extract(d)} disabled={pending}>Read with AI</Button>
                      )}
                      <button type="button" onClick={() => open(d)} disabled={pending} className="rounded-md p-1.5 text-secondary hover:bg-subtle hover:text-ink" aria-label={`Open ${d.fileName}`}>
                        <Download className="size-4" />
                      </button>
                      {canDelete && (
                        <button type="button" onClick={() => setDeleting(d)} className="rounded-md p-1.5 text-secondary hover:bg-red-light hover:text-red" aria-label={`Delete ${d.fileName}`}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={upload} loading={pending}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-control border border-dashed border-border bg-subtle p-4">
            <UploadCloud className="size-5 text-violet" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{file ? `${file.name} · ${formatBytes(file.size)}` : "PDF, PNG or JPEG · up to 10 MB"}</span>
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Choose file</Button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept={Object.keys(ACCEPTED_TYPES).join(",")}
              aria-label="Choose document"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const problem = validateUpload(f);
                setFileError(problem);
                setFile(problem ? null : f);
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="doc-kind">
              <Select id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Link to order (optional)" htmlFor="doc-po">
              <Select id="doc-po" value={poId} onChange={(e) => setPoId(e.target.value)}>
                <option value="">Not linked</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.poNumber}</option>)}
              </Select>
            </Field>
          </div>
          {uploader.stage === "uploading" && <p className="text-caption text-violet">Uploading…</p>}
          {fileError && <Notice tone="error">{fileError}</Notice>}
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.fileName}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={pending} onClick={remove}>Delete document</Button>
          </>
        }
      >
        The file is removed from storage permanently. Orders created from it are kept.
      </Modal>
    </>
  );
}
