"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, dbFail, zodFail } from "./guard";
import type { ActionResult } from "./types";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const milestoneSchema = z.object({
  id: z.uuid(),
  plannedDate: day,
  actualDate: z.union([day, z.literal("")]),
  status: z.enum(["not_started", "in_progress", "completed", "blocked"]),
  assigneeId: z.string(),
  priority: z.enum(["low", "normal", "high"]),
  notes: z.string().max(2000),
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;

/** Updates one T&A milestone. The change is recorded in the activity history. */
export async function updateMilestone(input: MilestoneInput): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  if (v.status === "completed" && !v.actualDate) return { ok: false, error: "Enter the actual completion date.", fieldErrors: { actualDate: "Required when completed." } };
  const { error, count } = await guard.ctx.supabase
    .from("milestones")
    .update(
      {
        planned_date: v.plannedDate,
        actual_date: v.actualDate || null,
        status: v.status,
        assignee_id: v.assigneeId || null,
        priority: v.priority,
        notes: v.notes,
      },
      { count: "exact" },
    )
    .eq("id", v.id)
    .eq("company_id", guard.ctx.companyId);
  if (error || !count) return dbFail(error?.message, "The milestone could not be saved.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Milestone updated." };
}

/** Marks a milestone completed today. */
export async function completeMilestone(id: string): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown milestone." };
  const { error, count } = await guard.ctx.supabase
    .from("milestones")
    .update({ status: "completed", actual_date: guard.ctx.today }, { count: "exact" })
    .eq("id", id)
    .eq("company_id", guard.ctx.companyId);
  if (error || !count) return dbFail(error?.message, "The milestone could not be completed.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Marked as completed." };
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "Describe the task.").max(200),
  poId: z.string(),
  dueDate: z.union([day, z.literal("")]),
  assigneeId: z.string(),
});

export async function createTask(input: z.infer<typeof taskSchema>): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { error } = await guard.ctx.supabase.from("tasks").insert({
    company_id: guard.ctx.companyId,
    title: v.title,
    po_id: v.poId || null,
    due_date: v.dueDate || null,
    assignee_id: v.assigneeId || guard.ctx.userId,
  });
  if (error) return dbFail(error.message, "The task could not be added.");
  revalidatePath("/tasks");
  return { ok: true, message: "Task added." };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown task." };
  const { error } = await guard.ctx.supabase.from("tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error) return dbFail(error.message, "The task could not be updated.");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const guard = await actionContext();
  if ("fail" in guard) return guard.fail;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown task." };
  const { error } = await guard.ctx.supabase.from("tasks").delete().eq("id", id).eq("company_id", guard.ctx.companyId);
  if (error) return dbFail(error.message, "The task could not be deleted.");
  revalidatePath("/tasks");
  return { ok: true };
}

/** Remembers which alerts the current user has read (per user, private). */
export async function setAlertsRead(alertIds: string[], read: boolean): Promise<ActionResult> {
  const guard = await actionContext(["company_admin", "merch_manager", "merchandiser", "viewer"]);
  if ("fail" in guard) return guard.fail;
  const ids = z.array(z.string().min(1).max(200)).max(1000).safeParse(alertIds);
  if (!ids.success) return { ok: false, error: "Invalid alerts." };
  const { supabase, companyId, userId } = guard.ctx;
  const { error } = read
    ? await supabase.from("alert_reads").upsert(ids.data.map((alert_id) => ({ company_id: companyId, user_id: userId, alert_id })), { onConflict: "user_id,alert_id" })
    : await supabase.from("alert_reads").delete().eq("user_id", userId).in("alert_id", ids.data);
  if (error) return dbFail(error.message, "Could not update the alert.");
  revalidatePath("/", "layout");
  return { ok: true };
}
