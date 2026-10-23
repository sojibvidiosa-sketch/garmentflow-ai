"use client";

import { useState } from "react";
import { prepareUpload, registerDocument } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/browser";

export type UploadStage = "idle" | "uploading" | "saving" | "done" | "error";

/**
 * Upload flow: the server issues a signed URL for the company's private
 * folder, the browser sends the file directly to storage (large files never
 * pass through our server), then the server records the document.
 */
export function useUploader() {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, kind: "purchase_order" | "tech_pack" | "buyer_email" | "other", poId: string | null = null): Promise<string | null> {
    setError(null);
    setStage("uploading");
    const prep = await prepareUpload({ fileName: file.name, mimeType: file.type, size: file.size });
    if (!prep.ok) return fail(prep.error);
    const { error: uploadError } = await createClient().storage.from("documents").uploadToSignedUrl(prep.data!.path, prep.data!.token, file, { contentType: file.type });
    if (uploadError) return fail("The file could not be uploaded. Check your connection and try again.");
    setStage("saving");
    const reg = await registerDocument({ path: prep.data!.path, fileName: file.name, mimeType: file.type, size: file.size, kind, poId });
    if (!reg.ok) return fail(reg.error);
    setStage("done");
    return reg.data!;
  }

  function fail(message: string) {
    setError(message);
    setStage("error");
    return null;
  }

  return { upload, stage, error, reset: () => (setStage("idle"), setError(null)) };
}
