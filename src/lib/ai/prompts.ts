/** Prompts and schemas for AI writing tasks. Facts are always passed in. */

export const EMAIL_INSTRUCTIONS = `You write professional business emails for a garment merchandiser at a buying house in Bangladesh.
Rules:
- Use only the order facts provided. Never invent dates, quantities, prices, approvals or commitments.
- If information the email needs is not in the facts, write a clear placeholder in square brackets, e.g. [confirm courier tracking number].
- Keep it concise: a greeting, 1-3 short paragraphs, a clear request or next step, and a sign-off with the sender name and company.
- Match the requested tone. Write in English.`;

export const EMAIL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: { subject: { type: "string" }, body: { type: "string" } },
} as const;

export const REPORT_INSTRUCTIONS = `You summarise a merchandising report for the management of a garment buying house.
Rules:
- Use only the figures and rows provided. Do not calculate new totals, percentages or forecasts unless they are explicitly given.
- Do not predict that shipments will be late; describe what is overdue or at risk based on the data only.
- 3 to 5 short sentences, then up to 3 bullet points of suggested follow-ups. Plain language, no markdown headings.`;
