/** Manual (bKash) billing shapes shared by the office and platform screens. */
export interface PaymentRequest {
  id: string;
  plan: string;
  amountBdt: number;
  senderNumber: string;
  trxId: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminPaymentRequest extends PaymentRequest {
  companyId: string;
  companyName: string;
}

export interface Billing {
  plan: string;
  status: string;
  periodEnd: string | null;
  seatLimit: number;
  poLimit: number;
  aiJobLimit: number;
  seatsUsed: number;
  activePos: number;
  aiJobsThisMonth: number;
  /** Empty for anyone who is not a Company Admin (the database returns no rows). */
  payments: PaymentRequest[];
}
