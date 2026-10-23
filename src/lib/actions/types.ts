/** Shapes returned by server actions (shared with their demo stand-ins). */

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const DEMO_MESSAGE = "Demo mode: changes are not saved. Create a workspace to save your own data.";

export interface SampleState {
  error?: string;
  done?: boolean;
}
