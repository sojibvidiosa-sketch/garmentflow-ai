/** Platform-admin data shapes (metadata only, never order contents). */

export interface AdminCompany {
  id: string;
  name: string;
  createdAt: string;
  plan: string;
  status: string;
  seatLimit: number;
  poLimit: number;
  aiJobLimit: number;
  members: number;
  activePos: number;
  aiJobs30d: number;
  aiCost30d: number;
  failedJobs30d: number;
  lastActivity: string | null;
}

export interface AdminJob {
  id: string;
  companyName: string;
  kind: "extraction" | "email_draft" | "report_summary";
  status: "queued" | "processing" | "succeeded" | "failed";
  model: string;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
}

export interface AdminActivity {
  companyName: string | null;
  action: string;
  targetType: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  company: string;
  phone: string;
  teamSize: string;
  message: string;
  createdAt: string;
}

export interface AdminData {
  companies: AdminCompany[];
  jobs: AdminJob[];
  activity: AdminActivity[];
  leads: Lead[];
}
