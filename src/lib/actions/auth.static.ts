// Demo-site stand-in for ./auth.ts (static build has no server).
import type { FormState } from "./types";

const off = async (): Promise<FormState> => ({ error: "Not available on the demo site." });
export const signIn = off;
export const signUp = off;
export const requestPasswordReset = off;
export const updatePassword = off;
export const createCompany = off;
export async function signOut() {}
