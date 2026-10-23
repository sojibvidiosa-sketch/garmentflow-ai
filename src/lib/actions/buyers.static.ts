// Demo-site stand-in for ./buyers.ts (static build has no server).
import { demoAction } from "./demo-stub";

export const saveBuyer = demoAction<string>;
export const deleteBuyer = demoAction;
