import "server-only";
import type { z } from "zod";
import { getContext } from "@/lib/data/supabase";
import type { Role } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_MESSAGE, type ActionResult } from "./types";

type Ctx = Awaited<ReturnType<typeof getContext>>;

const EDITORS: Role[] = ["company_admin", "merch_manager", "merchandiser"];

/**
 * Resolves the signed-in user's company for a server action and checks
 * their role. RLS enforces the same rules again in the database; this check
 * exists to return a clear message instead of a silent no-op.
 */
export async function actionContext(roles: Role[] = EDITORS): Promise<{ ctx: Ctx } | { fail: ActionResult<never> }> {
  if (!isSupabaseConfigured) return { fail: { ok: false, error: DEMO_MESSAGE } };
  const ctx = await getContext();
  if (!roles.includes(ctx.role)) return { fail: { ok: false, error: "Your role does not allow this change. Ask a Company Admin." } };
  return { ctx };
}

export function zodFail(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  return { ok: false, error: "Check the highlighted fields.", fieldErrors };
}

/** Turns database errors into messages a merchandiser can act on. */
export function dbFail(message: string | undefined, fallback: string): ActionResult<never> {
  const m = message ?? "";
  if (m.includes("duplicate key") && m.includes("po_number")) return { ok: false, error: "A purchase order with this PO number already exists." };
  if (m.includes("duplicate key")) return { ok: false, error: "This already exists." };
  if (m.includes("limit reached")) return { ok: false, error: `${m.replace(/^.*?:\s*/, "")}. Ask us to upgrade your plan.` };
  if (m.includes("row-level security") || m.includes("permission denied")) return { ok: false, error: "You do not have permission to do this." };
  if (m.includes("at least one active Company Admin")) return { ok: false, error: "A company needs at least one active Company Admin." };
  if (m.includes("ship date")) return { ok: false, error: "Set a ship date before creating the T&A plan." };
  return { ok: false, error: fallback };
}
