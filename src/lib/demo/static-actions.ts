/**
 * Stand-ins for the server actions, used only by the static demo build
 * (STATIC_DEMO=1), which has no server. Wired in next.config.ts.
 */
import type { FormState } from "@/lib/auth/actions";
import type { SampleState } from "@/lib/data/sample-actions";

const off = async (): Promise<FormState> => ({ error: "Not available on the demo site." });

export const signIn = off;
export const signUp = off;
export const requestPasswordReset = off;
export const updatePassword = off;
export const createCompany = off;
export async function signOut() {}
export async function loadSampleData(): Promise<SampleState> {
  return { error: "Not available on the demo site." };
}
