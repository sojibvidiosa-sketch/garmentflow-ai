import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase emails (sign-up confirmation,
 * password reset). Verifies the one-time token, which sets the session
 * cookie, then continues to `next` inside this app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next") ?? "/dashboard";
  const target = request.nextUrl.clone();
  target.search = "";
  target.pathname = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("missing token") };

  if (error) {
    target.pathname = "/login";
    target.searchParams.set("error", "link_expired");
  }
  return NextResponse.redirect(target);
}
