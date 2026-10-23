// Shared reply for the demo-site stand-ins (*.static.ts).
import { DEMO_MESSAGE, type ActionResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function demoAction<T = never>(..._args: unknown[]): Promise<ActionResult<T>> {
  return { ok: false, error: DEMO_MESSAGE };
}
