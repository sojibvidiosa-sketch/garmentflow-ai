"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { acceptInvitation } from "@/lib/actions/team";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { Role } from "@/lib/domain/types";

export function InvitationList({ invitations }: { invitations: { id: string; companyName: string; role: Role }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-8 space-y-3">
      <p className="text-caption font-semibold tracking-wide text-secondary uppercase">You have been invited</p>
      {invitations.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-3 rounded-control border border-border p-3">
          <div>
            <p className="text-[14px] font-semibold">{i.companyName}</p>
            <p className="text-caption text-secondary">as {ROLE_LABEL[i.role]}</p>
          </div>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await acceptInvitation(i.id);
                if (!res.ok) return setError(res.error);
                router.push("/dashboard");
              })
            }
          >
            Join
          </Button>
        </div>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
      <p className="pt-3 text-caption text-secondary">Or create a separate workspace for your own company:</p>
    </div>
  );
}
