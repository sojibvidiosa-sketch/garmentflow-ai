/**
 * Upload validation rules. Shared by the browser (instant feedback) and,
 * from Phase 4, re-checked on the server — the browser check is a
 * convenience, never the security boundary.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};

export const MIN_EMAIL_CHARS = 80;
export const MAX_EMAIL_CHARS = 20_000;

export function validateUpload(file: { name: string; type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES[file.type]) return `“${file.name}” is not a supported file. Upload a PDF, PNG or JPEG.`;
  if (file.size === 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” is larger than 10 MB.`;
  return null;
}

export function validateEmailText(text: string): string | null {
  const length = text.trim().length;
  if (length < MIN_EMAIL_CHARS) return `Paste the full buyer email (at least ${MIN_EMAIL_CHARS} characters).`;
  if (length > MAX_EMAIL_CHARS) return "This email is too long. Paste only the relevant message.";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
