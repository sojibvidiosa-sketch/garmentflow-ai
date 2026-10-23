/**
 * Deterministic email templates (no AI). Used in Phase 1 so the composer
 * is usable, and kept later as the fallback when AI is unavailable.
 * Only approved order data is inserted — nothing is invented.
 */
export type EmailPurpose = "sample_followup" | "fabric_followup" | "shipment_status" | "buyer_clarification";
export type Recipient = "buyer" | "supplier" | "factory";
export type EmailTone = "formal" | "friendly" | "firm";

export const PURPOSE_LABEL: Record<EmailPurpose, string> = {
  sample_followup: "Sample approval follow-up",
  fabric_followup: "Fabric arrival follow-up",
  shipment_status: "Shipment status request",
  buyer_clarification: "Buyer clarification",
};

export const RECIPIENT_LABEL: Record<Recipient, string> = { buyer: "Buyer", supplier: "Fabric supplier / mill", factory: "Factory" };
export const TONE_LABEL: Record<EmailTone, string> = { formal: "Formal", friendly: "Friendly", firm: "Firm" };

export interface EmailContext {
  poNumber: string;
  buyerName: string;
  styleNo: string;
  description: string;
  quantity: string;
  shipDate: string;
  nextMilestone: string | null;
  senderName: string;
  companyName: string;
}

const GREETING: Record<EmailTone, (r: string) => string> = {
  formal: (r) => `Dear ${r},`,
  friendly: (r) => `Hi ${r},`,
  firm: (r) => `Dear ${r},`,
};

const CLOSING: Record<EmailTone, string> = {
  formal: "Thank you for your kind cooperation.\n\nBest regards,",
  friendly: "Thanks so much for your help!\n\nBest,",
  firm: "Your prompt response is required to keep this order on schedule.\n\nRegards,",
};

export function buildTemplate(purpose: EmailPurpose, recipient: Recipient, tone: EmailTone, c: EmailContext, notes = "") {
  const who = recipient === "buyer" ? `${c.buyerName} team` : recipient === "supplier" ? "Supplier team" : "Factory team";
  const ref = `${c.poNumber} · Style ${c.styleNo} (${c.description})`;
  const subjects: Record<EmailPurpose, string> = {
    sample_followup: `Sample approval status — ${ref}`,
    fabric_followup: `Fabric in-house date confirmation — ${ref}`,
    shipment_status: `Shipment status update — ${ref}`,
    buyer_clarification: `Clarification required — ${ref}`,
  };
  const bodies: Record<EmailPurpose, string> = {
    sample_followup: `We are following up on the sample submitted for ${ref}. Could you please share your approval or comments so that we can proceed${c.nextMilestone ? ` with ${c.nextMilestone}` : ""}?`,
    fabric_followup: `Please confirm the in-house date for the fabric booked against ${ref} (${c.quantity} pcs). Production planning depends on this date to meet the shipment on ${c.shipDate}.`,
    shipment_status: `Please share the current status for ${ref}, planned to ship on ${c.shipDate}. Kindly include production progress and any risk to the shipment date.`,
    buyer_clarification: `To proceed with ${ref}, we need clarification on the following points:\n\n• [Add the open question here]\n\nThe current planned shipment date is ${c.shipDate}.`,
  };
  const extra = notes.trim() ? `\n\n${notes.trim()}` : "";
  const body = `${GREETING[tone](who)}\n\n${bodies[purpose]}${extra}\n\n${CLOSING[tone]}\n${c.senderName}\n${c.companyName}`;
  return { subject: subjects[purpose], body };
}
