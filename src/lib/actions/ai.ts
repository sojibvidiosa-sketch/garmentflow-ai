"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiErrorMessage, isAiConfigured, structuredCall, textCall, type AiUsage } from "@/lib/ai/client";
import { EMAIL_INSTRUCTIONS, EMAIL_JSON_SCHEMA, REPORT_INSTRUCTIONS } from "@/lib/ai/prompts";
import { getReportData } from "@/lib/data/supabase";
import { totalQuantity } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, MILESTONE_ORDER } from "@/lib/domain/labels";
import { PURPOSE_LABEL, RECIPIENT_LABEL, TONE_LABEL } from "@/lib/email-templates";
import { buildReports, type ReportKey } from "@/lib/reports";
import { formatDate, formatNumber } from "@/lib/utils";
import { actionContext, dbFail, zodFail } from "./guard";
import type { ActionResult } from "./types";

type Ctx = Extract<Awaited<ReturnType<typeof actionContext>>, { ctx: unknown }>["ctx"];

const NOT_CONFIGURED = "AI writing is not switched on yet (OPENAI_API_KEY is missing). Use the standard template instead.";

async function underQuota(ctx: Ctx): Promise<boolean> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [{ data: sub }, { count }] = await Promise.all([
    ctx.supabase.from("subscriptions").select("ai_job_limit").eq("company_id", ctx.companyId).maybeSingle(),
    ctx.supabase.from("ai_jobs").select("id", { count: "exact", head: true }).eq("company_id", ctx.companyId).gte("created_at", start.toISOString()),
  ]);
  return (count ?? 0) < (sub?.ai_job_limit ?? 300);
}

/** Runs an AI task and records it in ai_jobs (status, tokens, cost). */
async function tracked<T>(ctx: Ctx, kind: "email_draft" | "report_summary", run: () => Promise<{ value: T; usage: AiUsage }>): Promise<ActionResult<{ value: T; jobId: string }>> {
  if (!(await underQuota(ctx))) return { ok: false, error: "Your plan's monthly AI limit is used up. It resets on the 1st." };
  const { data: job, error } = await ctx.supabase.from("ai_jobs").insert({ company_id: ctx.companyId, kind, status: "processing" }).select("id").single();
  if (error) return dbFail(error.message, "Could not start the AI request.");
  try {
    const { value, usage } = await run();
    await ctx.supabase
      .from("ai_jobs")
      .update({ status: "succeeded", model: usage.model, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cost_usd: usage.costUsd, finished_at: new Date().toISOString() })
      .eq("id", job.id);
    return { ok: true, data: { value, jobId: job.id } };
  } catch (e) {
    await ctx.supabase.from("ai_jobs").update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 500) : "unknown", finished_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: false, error: aiErrorMessage(e) };
  }
}

const emailSchema = z.object({
  poId: z.uuid(),
  purpose: z.enum(Object.keys(PURPOSE_LABEL) as [keyof typeof PURPOSE_LABEL]),
  recipient: z.enum(Object.keys(RECIPIENT_LABEL) as [keyof typeof RECIPIENT_LABEL]),
  tone: z.enum(Object.keys(TONE_LABEL) as [keyof typeof TONE_LABEL]),
  notes: z.string().max(1000),
});

/** Drafts an email from the order's stored (approved) data. Never sends anything. */
export async function generateEmailDraft(input: z.infer<typeof emailSchema>): Promise<ActionResult<{ subject: string; body: string; jobId: string }>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!isAiConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const ctx = guard.ctx;

  const { orders, milestones, buyers } = await getReportData();
  const po = orders.find((o) => o.id === v.poId);
  if (!po) return { ok: false, error: "Order not found." };
  const buyer = buyers.find((b) => b.id === po.buyerId);
  const open = milestones
    .filter((m) => m.poId === po.id && m.status !== "completed")
    .sort((a, b) => MILESTONE_ORDER.indexOf(a.key) - MILESTONE_ORDER.indexOf(b.key))
    .slice(0, 4)
    .map((m) => `${MILESTONE_LABEL[m.key]} planned ${formatDate(m.plannedDate)} (${m.status.replace("_", " ")})`);

  const facts = [
    `PO number: ${po.poNumber}`,
    `Buyer: ${buyer?.name ?? "not set"}`,
    ...po.items.map((i) => `Style: ${i.styleNo} — ${i.description}${i.fabric ? `, ${i.fabric}` : ""}`),
    `Total quantity: ${formatNumber(totalQuantity(po))} pcs`,
    `Planned ship date: ${po.shipDate ? formatDate(po.shipDate) : "not set"}`,
    open.length ? `Open milestones: ${open.join("; ")}` : "Open milestones: none",
    `Sender: ${ctx.fullName}, ${ctx.companyName}`,
  ].join("\n");
  const request = `Write a ${TONE_LABEL[v.tone].toLowerCase()} email to the ${RECIPIENT_LABEL[v.recipient].toLowerCase()}.
Purpose: ${PURPOSE_LABEL[v.purpose]}.
${v.notes.trim() ? `Also include: ${v.notes.trim()}\n` : ""}
Order facts:
${facts}`;

  const res = await tracked(ctx, "email_draft", async () => {
    const out = await structuredCall({ instructions: EMAIL_INSTRUCTIONS, parts: [{ type: "input_text", text: request }], schemaName: "email_draft", schema: EMAIL_JSON_SCHEMA as unknown as Record<string, unknown> });
    const draft = z.object({ subject: z.string(), body: z.string() }).parse(out.json);
    return { value: draft, usage: out.usage };
  });
  if (!res.ok) return res;
  return { ok: true, data: { ...res.data!.value, jobId: res.data!.jobId } };
}

const draftSchema = z.object({
  id: z.string(),
  poId: z.string(),
  purpose: z.string().max(60),
  recipient: z.string().max(60),
  tone: z.string().max(30),
  subject: z.string().trim().min(1, "Add a subject.").max(300),
  body: z.string().trim().min(1, "Write the message.").max(20000),
  aiJobId: z.string(),
});

export async function saveEmailDraft(input: z.infer<typeof draftSchema>): Promise<ActionResult<string>> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const row = {
    po_id: v.poId || null,
    purpose: v.purpose,
    recipient_type: v.recipient,
    tone: v.tone,
    subject: v.subject,
    body: v.body,
    ai_job_id: v.aiJobId || null,
  };
  const { supabase, companyId } = guard.ctx;
  const { data, error } = v.id
    ? await supabase.from("email_drafts").update(row).eq("id", v.id).eq("company_id", companyId).select("id").single()
    : await supabase.from("email_drafts").insert({ ...row, company_id: companyId }).select("id").single();
  if (error) return dbFail(error.message, "The draft could not be saved.");
  revalidatePath("/email");
  return { ok: true, data: data.id, message: "Draft saved." };
}

export async function deleteEmailDraft(id: string): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown draft." };
  const { error } = await guard.ctx.supabase.from("email_drafts").delete().eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error) return dbFail(error.message, "The draft could not be deleted.");
  revalidatePath("/email");
  return { ok: true, message: "Draft deleted." };
}

const REPORT_KEYS = ["po_summary", "pending_tasks", "completed", "overdue", "upcoming_shipments", "team"] as const;

/** Writes a short narrative from the report's computed figures (numbers come from code, not AI). */
export async function generateReportSummary(key: ReportKey): Promise<ActionResult<string>> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  if (!isAiConfigured) return { ok: false, error: "AI summaries are not switched on yet (OPENAI_API_KEY is missing)." };
  if (!(REPORT_KEYS as readonly string[]).includes(key)) return { ok: false, error: "Unknown report." };

  const report = buildReports(await getReportData()).find((r) => r.key === key)!;
  const table = [report.headers.join(" | "), ...report.rows.slice(0, 40).map((r) => r.join(" | "))].join("\n");
  const input = `Report: ${report.title} — ${report.description}
Summary figures: ${report.summary.map((s) => `${s.label}: ${s.value}`).join("; ")}
Rows (${report.rows.length} total${report.rows.length > 40 ? ", first 40 shown" : ""}):
${table}`;

  const res = await tracked(guard.ctx, "report_summary", async () => {
    const out = await textCall(REPORT_INSTRUCTIONS, input);
    return { value: out.text, usage: out.usage };
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data!.value };
}
