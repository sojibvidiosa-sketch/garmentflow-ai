// Demo-site stand-in for ./orders.ts (static build has no server).
import { demoAction } from "./demo-stub";

export const savePurchaseOrder = demoAction<string>;
export const updatePoStatus = demoAction;
export const deletePurchaseOrder = demoAction;
export const createTnaPlan = demoAction<number>;
