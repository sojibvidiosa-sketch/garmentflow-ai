import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { InvitationList } from "@/components/auth/invitation-list";
import { ButtonLink } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/states";
import type { Role } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Join a workspace" };

/** Static demo build: there are no real invitations to pre-render. */
export function generateStaticParams() {
  return [{ token: "sample" }];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured) {
    return <Notice tone="warning" title="Invitations are not connected on this demo site" className="mt-8" />;
  }
  const invalid = (
    <>
      <Notice tone="error" title="This invitation is not valid" className="mt-8">
        It may have expired, been revoked, or been sent to a different email address. Ask your Company Admin to invite you again.
      </Notice>
      <ButtonLink href="/login" variant="secondary" className="mt-5 w-full">Go to sign in</ButtonLink>
    </>
  );
  if (!UUID.test(token)) return invalid;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const next = encodeURIComponent(`/invite/${token}`);

  if (!auth.user) {
    // Invitation details are only shown to the invited, signed-in email address.
    return (
      <div className="mt-8 space-y-3">
        <Notice tone="info">Sign in or create an account with the email address this invitation was sent to.</Notice>
        <ButtonLink href={`/login?next=${next}`} className="w-full">Sign in to accept</ButtonLink>
        <ButtonLink href="/signup" variant="secondary" className="w-full">Create an account</ButtonLink>
      </div>
    );
  }

  const { data } = await supabase.rpc("my_invitations");
  const match = ((data ?? []) as { id: string; company_name: string; role: Role }[]).find((i) => i.id === token);
  if (!match) return invalid;
  return <InvitationList invitations={[{ id: match.id, companyName: match.company_name, role: match.role }]} footnote={null} />;
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <>
      <AuthHeading title="Join your team on GarmentFlow">Accept the invitation to open your company workspace.</AuthHeading>
      <Suspense fallback={<Skeleton className="mt-8 h-[120px]" />}>
        <Invitation params={params} />
      </Suspense>
    </>
  );
}
