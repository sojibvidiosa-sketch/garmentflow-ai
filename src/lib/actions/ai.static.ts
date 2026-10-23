// Demo-site stand-in for ./ai.ts (static build has no server).
import { demoAction } from "./demo-stub";

export const generateEmailDraft = demoAction<{ subject: string; body: string; jobId: string }>;
export const saveEmailDraft = demoAction<string>;
export const deleteEmailDraft = demoAction;
export const generateReportSummary = demoAction<string>;
