"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MailPlus, UserMinus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { inviteMember, removeMember, revokeInvitation, updateMember } from "@/lib/actions/team";
import type { TeamData } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/domain/labels";
import type { Role } from "@/lib/domain/types";
import { formatDate, initials } from "@/lib/utils";

const ROLE_HELP: Record<Role, string> = {
  company_admin: "Everything, including team, roles and company settings",
  merch_manager: "All orders and T&A; can delete orders, buyers and documents",
  merchandiser: "Create and update orders, documents, T&A and emails",
  viewer: "Read-only access to orders, T&A and reports",
};

export function TeamManager({ team, currentUserId, isAdmin, seatsLeft }: { team: TeamData; currentUserId: string; isAdmin: boolean; seatsLeft: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("merchandiser");
  const [removing, setRemoving] = useState<TeamData["members"][number] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
    start(async () => {
      const res = await fn();
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : (res.error ?? "Something went wrong.") });
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}
        <Card className="p-2.5">
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                {isAdmin && <Th className="w-12"><span className="sr-only">Remove</span></Th>}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-violet-light text-[11px] font-semibold text-violet">{initials(m.fullName)}</span>
                      <span>
                        <span className="block font-medium">{m.fullName}{m.id === currentUserId && <span className="text-secondary"> (you)</span>}</span>
                        <span className="text-caption text-secondary">{m.email}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    {isAdmin ? (
                      <Select
                        aria-label={`Role for ${m.fullName}`}
                        value={m.role}
                        disabled={pending}
                        className="h-9 w-52"
                        onChange={(e) => run(() => updateMember({ userId: m.id, role: e.target.value, status: m.status }))}
                      >
                        {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    ) : (
                      ROLE_LABEL[m.role]
                    )}
                  </Td>
                  <Td>
                    {isAdmin && m.id !== currentUserId ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => updateMember({ userId: m.id, role: m.role, status: m.status === "active" ? "suspended" : "active" }))}
                        title={m.status === "active" ? "Suspend access" : "Restore access"}
                      >
                        <Badge tone={m.status === "active" ? "green" : "red"}>{m.status === "active" ? "Active" : "Suspended"}</Badge>
                      </button>
                    ) : (
                      <Badge tone={m.status === "active" ? "green" : "red"}>{m.status === "active" ? "Active" : "Suspended"}</Badge>
                    )}
                  </Td>
                  <Td className="text-secondary">{formatDate(m.joinedAt.slice(0, 10))}</Td>
                  {isAdmin && (
                    <Td>
                      {m.id !== currentUserId && (
                        <button type="button" onClick={() => setRemoving(m)} className="rounded-md p-1.5 text-secondary hover:bg-red-light hover:text-red" aria-label={`Remove ${m.fullName}`}>
                          <UserMinus className="size-4" />
                        </button>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {team.invitations.length > 0 && (
          <Card>
            <CardHeader title="Pending invitations" />
            <CardBody className="pt-3">
              <ul className="divide-y divide-border">
                {team.invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{i.email}</span>
                      <span className="block text-caption text-secondary">{ROLE_LABEL[i.role]} · expires {formatDate(i.expiresAt.slice(0, 10))}</span>
                    </span>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} disabled={pending} onClick={() => run(() => revokeInvitation(i.id))}>Revoke</Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <Card>
            <CardHeader title="Invite a teammate" description={`${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left on your plan`} />
            <CardBody>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => inviteMember({ email, role }), () => setEmail("")); }}>
                <Field label="Work email" htmlFor="invite-email">
                  <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
                </Field>
                <Field label="Role" htmlFor="invite-role" hint={ROLE_HELP[role]}>
                  <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Button type="submit" className="w-full" loading={pending} disabled={seatsLeft <= 0} icon={<MailPlus className="size-4" />}>Create invitation</Button>
              </form>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="Roles" />
          <CardBody className="space-y-3 pt-3 text-[13px]">
            {Object.entries(ROLE_HELP).map(([r, help]) => (
              <div key={r}>
                <p className="font-semibold">{ROLE_LABEL[r as Role]}</p>
                <p className="text-secondary">{help}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.fullName}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" loading={pending} onClick={() => removing && run(() => removeMember(removing.id), () => setRemoving(null))}>Remove member</Button>
          </>
        }
      >
        They lose access to this workspace immediately. Their past activity stays in the history.
      </Modal>
    </div>
  );
}
