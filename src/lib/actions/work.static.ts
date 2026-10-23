// Demo-site stand-in for ./work.ts (static build has no server).
import { demoAction } from "./demo-stub";

export const updateMilestone = demoAction;
export const completeMilestone = demoAction;
export const createTask = demoAction;
export const setTaskDone = demoAction;
export const deleteTask = demoAction;
export const setAlertsRead = demoAction;
