// Demo-site stand-in for ./documents.ts (static build has no server).
import { demoAction } from "./demo-stub";

export const prepareUpload = demoAction<{ path: string; token: string }>;
export const registerDocument = demoAction<string>;
export const extractDocument = demoAction<string>;
export const extractEmailText = demoAction<string>;
export const approveExtraction = demoAction<string>;
export const rejectExtraction = demoAction;
export const getDocumentLink = demoAction<string>;
export const deleteDocument = demoAction;
