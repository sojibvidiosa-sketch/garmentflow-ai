// Demo-site stand-in for ./contact.ts (static build has no server).
import type { FormState } from "./types";

export async function submitDemoRequest(): Promise<FormState> {
  return { error: "The form is not connected on this demo site. Please email us instead." };
}
