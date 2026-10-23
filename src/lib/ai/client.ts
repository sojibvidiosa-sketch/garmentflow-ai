import "server-only";
import OpenAI from "openai";
import { estimateCostUsd } from "./extraction";

/** Server-only OpenAI access. The key never reaches the browser bundle. */

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const INPUT_PER_M = Number(process.env.OPENAI_INPUT_USD_PER_M ?? 0.4);
const OUTPUT_PER_M = Number(process.env.OPENAI_OUTPUT_USD_PER_M ?? 1.6);

export const isAiConfigured = Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | null = null;
function openai() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 55_000, maxRetries: 1 });
  return client;
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

type InputPart =
  | { type: "input_text"; text: string }
  | { type: "input_file"; filename: string; file_data: string }
  | { type: "input_image"; image_url: string; detail: "high" };

/** One structured-output call. Returns the parsed JSON object and usage. */
export async function structuredCall(opts: {
  instructions: string;
  parts: InputPart[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<{ json: unknown; usage: AiUsage }> {
  const res = await openai().responses.create({
    model: AI_MODEL,
    instructions: opts.instructions,
    input: [{ role: "user", content: opts.parts }],
    text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
  });
  const usage = usageOf(res.usage);
  if (res.status === "incomplete") throw new Error("The AI reply was cut off. Try a shorter document.");
  return { json: JSON.parse(res.output_text), usage };
}

/** Plain text generation (email drafts, report summaries). */
export async function textCall(instructions: string, input: string): Promise<{ text: string; usage: AiUsage }> {
  const res = await openai().responses.create({ model: AI_MODEL, instructions, input });
  return { text: res.output_text.trim(), usage: usageOf(res.usage) };
}

function usageOf(u: { input_tokens: number; output_tokens: number } | undefined | null): AiUsage {
  const inputTokens = u?.input_tokens ?? 0;
  const outputTokens = u?.output_tokens ?? 0;
  return { model: AI_MODEL, inputTokens, outputTokens, costUsd: estimateCostUsd(inputTokens, outputTokens, INPUT_PER_M, OUTPUT_PER_M) };
}

/** Maps OpenAI/network errors to messages a merchandiser can act on. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) return "The AI service key is invalid. Ask your admin to check OPENAI_API_KEY.";
    if (e.status === 429) return "The AI service is busy or out of credit. Try again in a minute.";
    if (e.status === 400) return "The AI service could not read this file. Try a clearer PDF or paste the email text.";
    return "The AI service returned an error. Try again.";
  }
  if (e instanceof Error && e.message.startsWith("The AI")) return e.message;
  return "The AI request failed or timed out. Try again.";
}
