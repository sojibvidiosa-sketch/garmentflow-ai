"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiErrorMessage, isAiConfigured, structuredCall, type AiUsage } from "@/lib/ai/client";
import { EXTRACTION_INSTRUCTIONS, EXTRACTION_JSON_SCHEMA, parseExtraction } from "@/lib/ai/extraction";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, validateEmailText, validateUpload } from "@/lib/upload-rules";
import { poSchema, type PoInput } from "@/lib/validation/po";
import { actionContext, dbFail, zodFail } from "./guard";
import type { ActionResult } from "./types";

type Ctx = Extract<Awaited<ReturnType<typeof actionContext>>, { ctx: unknown }>["ctx"];

const BUCKET = "documents";
const KINDS = ["purchase_order", "tech_pack", "buyer_email", "other"] as const;

function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-120);
  return cleaned || "document";
}

/** Step 1: a short-lived signed URL so the browser uploads straight to private storage. */
export async function prepareUpload(file: { fileName: string; mimeType: string; size: number }): Promise<ActionResult<{ path: string; token: string }>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const problem = validateUpload({ name: file.fileName, type: file.mimeType, size: file.size });
  if (problem) return { ok: false, error: problem };
  const path = `${guard.ctx.companyId}/${crypto.randomUUID()}/${safeFileName(file.fileName)}`;
  const { data, error } = await guard.ctx.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return { ok: false, error: "Upload could not start. Try again." };
  return { ok: true, data: { path, token: data.token } };
}

const registerSchema = z.object({
  path: z.string().min(10).max(400),
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(Object.keys(ACCEPTED_TYPES) as [string, ...string[]]),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  kind: z.enum(KINDS),
  poId: z.uuid().nullable(),
});

/** Step 2: after the upload, record the document (only inside the caller's company folder). */
export async function registerDocument(input: z.infer<typeof registerSchema>): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { supabase, companyId } = guard.ctx;
  if (!v.path.startsWith(`${companyId}/`)) return { ok: false, error: "Invalid upload location." };

  const folder = v.path.slice(0, v.path.lastIndexOf("/"));
  const { data: listed } = await supabase.storage.from(BUCKET).list(folder);
  if (!listed?.some((o) => `${folder}/${o.name}` === v.path)) return { ok: false, error: "The upload did not finish. Try again." };

  const { data, error } = await supabase
    .from("documents")
    .insert({ company_id: companyId, po_id: v.poId, storage_path: v.path, file_name: v.fileName, kind: v.kind, mime_type: v.mimeType, size_bytes: v.size })
    .select("id")
    .single();
  if (error) return dbFail(error.message, "The document could not be saved.");
  revalidatePath("/documents");
  return { ok: true, data: data.id };
}

async function checkQuota(ctx: Ctx): Promise<string | null> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [{ data: sub }, { count }] = await Promise.all([
    ctx.supabase.from("subscriptions").select("ai_job_limit").eq("company_id", ctx.companyId).maybeSingle(),
    ctx.supabase.from("ai_jobs").select("id", { count: "exact", head: true }).eq("company_id", ctx.companyId).gte("created_at", start.toISOString()),
  ]);
  const limit = sub?.ai_job_limit ?? 300;
  return (count ?? 0) >= limit ? `Your plan's monthly AI limit (${limit} requests) is used up. It resets on the 1st, or ask us to raise it.` : null;
}

async function runExtraction(
  ctx: Ctx,
  documentId: string | null,
  parts: Parameters<typeof structuredCall>[0]["parts"],
  meta: { fileName: string; sourceText: string },
): Promise<ActionResult<string>> {
  const { supabase, companyId } = ctx;
  const { data: job, error: jobError } = await supabase
    .from("ai_jobs")
    .insert({ company_id: companyId, kind: "extraction", status: "processing", document_id: documentId })
    .select("id")
    .single();
  if (jobError) return dbFail(jobError.message, "Could not start the AI job.");

  let usage: AiUsage | null = null;
  try {
    const result = await structuredCall({ instructions: EXTRACTION_INSTRUCTIONS, parts, schemaName: "garment_purchase_order", schema: EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown> });
    usage = result.usage;
    const reply = parseExtraction(result.json);
    const { error } = await supabase.from("extraction_results").insert({
      company_id: companyId,
      ai_job_id: job.id,
      document_id: documentId,
      raw: { reply, file_name: meta.fileName, source_text: meta.sourceText },
    });
    if (error) throw new Error("The AI result could not be saved.");
    await supabase
      .from("ai_jobs")
      .update({ status: "succeeded", model: usage.model, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cost_usd: usage.costUsd, finished_at: new Date().toISOString() })
      .eq("id", job.id);
    return { ok: true, data: job.id };
  } catch (e) {
    const message = aiErrorMessage(e);
    await supabase
      .from("ai_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message.slice(0, 500) : "unknown error",
        model: usage?.model ?? "",
        input_tokens: usage?.inputTokens ?? 0,
        output_tokens: usage?.outputTokens ?? 0,
        cost_usd: usage?.costUsd ?? 0,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { ok: false, error: message };
  }
}

/** Reads an uploaded PDF/image with AI. Returns the AI job id for the review screen. */
export async function extractDocument(documentId: string): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!isAiConfigured) return { ok: false, error: "AI extraction is not switched on yet (OPENAI_API_KEY is missing). You can still create the order manually." };
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: "Unknown document." };
  const quota = await checkQuota(guard.ctx);
  if (quota) return { ok: false, error: quota };

  const { supabase } = guard.ctx;
  const { data: doc } = await supabase.from("documents").select("id, storage_path, file_name, mime_type").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(doc.storage_path);
  if (error || !blob) return { ok: false, error: "The file could not be read from storage." };
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  const part =
    doc.mime_type === "application/pdf"
      ? { type: "input_file" as const, filename: doc.file_name, file_data: `data:application/pdf;base64,${base64}` }
      : { type: "input_image" as const, image_url: `data:${doc.mime_type};base64,${base64}`, detail: "high" as const };
  const res = await runExtraction(guard.ctx, doc.id, [{ type: "input_text", text: "Extract the purchase order from this document." }, part], { fileName: doc.file_name, sourceText: "" });
  revalidatePath("/documents");
  return res;
}

/** Reads a pasted buyer email with AI. */
export async function extractEmailText(text: string): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!isAiConfigured) return { ok: false, error: "AI extraction is not switched on yet (OPENAI_API_KEY is missing). You can still create the order manually." };
  const problem = validateEmailText(text);
  if (problem) return { ok: false, error: problem };
  const quota = await checkQuota(guard.ctx);
  if (quota) return { ok: false, error: quota };
  return runExtraction(guard.ctx, null, [{ type: "input_text", text: `Buyer email:\n\n${text.trim()}` }], { fileName: "Pasted buyer email", sourceText: text.trim() });
}

/**
 * Human approval: creates the purchase order from the reviewed values,
 * links the source document and records who approved it.
 */
export async function approveExtraction(jobId: string, input: PoInput, buyerName: string, createPlan: boolean): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(jobId).success) return { ok: false, error: "Unknown extraction." };
  const { supabase, companyId, userId } = guard.ctx;

  const { data: result } = await supabase.from("extraction_results").select("id, status, document_id").eq("ai_job_id", jobId).maybeSingle();
  if (!result) return { ok: false, error: "Extraction not found." };
  if (result.status === "approved") return { ok: false, error: "This extraction was already approved." };

  // Link to an existing buyer by name, or add the buyer.
  let buyerId = input.buyerId;
  const name = buyerName.trim();
  if (!buyerId && name) {
    const { data: existing } = await supabase.from("buyers").select("id").eq("company_id", companyId).ilike("name", name.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
    buyerId = existing?.id ?? "";
    if (!buyerId) {
      const { data: created } = await supabase.from("buyers").insert({ company_id: companyId, name }).select("id").single();
      buyerId = created?.id ?? "";
    }
  }

  const parsed = poSchema.safeParse({ ...input, buyerId, merchandiserId: input.merchandiserId || userId });
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { data: poId, error } = await supabase.rpc("save_purchase_order", {
    p: {
      company_id: companyId,
      po_number: v.poNumber,
      buyer_id: v.buyerId,
      season: v.season,
      status: "confirmed",
      order_date: v.orderDate,
      ship_date: v.shipDate,
      currency: v.currency,
      unit_price: v.unitPrice === null ? "" : String(v.unitPrice),
      merchandiser_id: v.merchandiserId,
      notes: v.notes,
      special_instructions: v.specialInstructions,
      items: v.items.map((i) => ({ style_no: i.styleNo, description: i.description, fabric: i.fabric, gsm: i.gsm === null ? "" : String(i.gsm), colors: i.colors })),
    },
  });
  if (error) return dbFail(error.message, "The order could not be created.");

  await supabase
    .from("extraction_results")
    .update({ status: "approved", reviewed: v, po_id: poId, reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("id", result.id);
  if (result.document_id) await supabase.from("documents").update({ po_id: poId }).eq("id", result.document_id);
  if (createPlan) await supabase.rpc("create_tna_plan", { order_id: poId });

  revalidatePath("/", "layout");
  return { ok: true, data: String(poId), message: "Order created from the reviewed document." };
}

export async function rejectExtraction(jobId: string): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(jobId).success) return { ok: false, error: "Unknown extraction." };
  await guard.ctx.supabase.from("extraction_results").update({ status: "rejected", reviewed_by: guard.ctx.userId, reviewed_at: new Date().toISOString() }).eq("ai_job_id", jobId);
  revalidatePath("/documents");
  return { ok: true, message: "Extraction discarded. The document stays in the document center." };
}

/** A 60-second download link for a document in the caller's company. */
export async function getDocumentLink(documentId: string): Promise<ActionResult<string>> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: "Unknown document." };
  const { data: doc } = await guard.ctx.supabase.from("documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };
  const { data, error } = await guard.ctx.supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60);
  if (error) return { ok: false, error: "The download link could not be created." };
  return { ok: true, data: data.signedUrl };
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager"]);
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: "Unknown document." };
  const { supabase } = guard.ctx;
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };
  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return dbFail(error.message, "The document could not be deleted.");
  revalidatePath("/documents");
  return { ok: true, message: "Document deleted." };
}
