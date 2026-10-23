"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Notice } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { deleteBuyer, saveBuyer } from "@/lib/actions/buyers";
import type { BuyerInput } from "@/lib/validation/po";
import { formatNumber } from "@/lib/utils";

export interface BuyerRow {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
  activeOrders: number;
  totalOrders: number;
  quantity: number;
}

const EMPTY: BuyerInput = { name: "", country: "", contactEmail: "" };

export function BuyersManager({ buyers, canDelete }: { buyers: BuyerRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<BuyerInput | null>(null);
  const [deleting, setDeleting] = useState<BuyerRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return buyers.filter((b) => !n || `${b.name} ${b.country} ${b.contactEmail}`.toLowerCase().includes(n));
  }, [buyers, q]);

  function save() {
    if (!editing) return;
    start(async () => {
      const res = await saveBuyer(editing);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setEditing(null);
      setMessage({ ok: true, text: res.message ?? "Saved." });
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;
    start(async () => {
      const res = await deleteBuyer(deleting.id);
      setDeleting(null);
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Deleted.") : res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buyers" aria-label="Search buyers" className="pl-9" />
        </div>
        <Button className="sm:ml-auto" icon={<Plus className="size-4" />} onClick={() => { setErrors({}); setMessage(null); setEditing({ ...EMPTY }); }}>
          Add buyer
        </Button>
      </div>
      {message && !editing && <Notice tone={message.ok ? "success" : "error"} className="mb-4">{message.text}</Notice>}

      <Card className="p-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<UsersRound className="size-5" />}
            title={buyers.length ? "No buyers match" : "No buyers yet"}
            description={buyers.length ? "Try a different name or country." : "Add the brands and retailers you work with to link them to orders."}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Buyer</Th>
                <Th>Country</Th>
                <Th>Contact</Th>
                <Th className="text-right">Active orders</Th>
                <Th className="text-right">All orders</Th>
                <Th className="text-right">Quantity (pcs)</Th>
                <Th className="w-24"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <Tr key={b.id}>
                  <Td className="font-semibold">
                    <Link href={`/orders?q=${encodeURIComponent(b.name)}`} className="hover:text-violet">{b.name}</Link>
                  </Td>
                  <Td>{b.country || "—"}</Td>
                  <Td className="text-secondary">{b.contactEmail || "—"}</Td>
                  <Td className="text-right tabular-nums">{b.activeOrders}</Td>
                  <Td className="text-right tabular-nums">{b.totalOrders}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(b.quantity)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="rounded-md p-1.5 text-secondary hover:bg-subtle hover:text-ink" aria-label={`Edit ${b.name}`}
                        onClick={() => { setErrors({}); setMessage(null); setEditing({ id: b.id, name: b.name, country: b.country, contactEmail: b.contactEmail }); }}>
                        <Pencil className="size-4" />
                      </button>
                      {canDelete && (
                        <button type="button" className="rounded-md p-1.5 text-secondary hover:bg-red-light hover:text-red" aria-label={`Delete ${b.name}`} onClick={() => setDeleting(b)}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit buyer" : "Add buyer"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={save}>Save buyer</Button>
          </>
        }
      >
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Buyer name" htmlFor="buyer-name" required error={errors.name}>
              <Input id="buyer-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Northline Apparel" />
            </Field>
            <Field label="Country" htmlFor="buyer-country">
              <Input id="buyer-country" value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} placeholder="United Kingdom" />
            </Field>
            <Field label="Contact email" htmlFor="buyer-email" error={errors.contactEmail}>
              <Input id="buyer-email" type="email" value={editing.contactEmail} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} placeholder="sourcing@buyer.com" />
            </Field>
            {message && !message.ok && <Notice tone="error">{message.text}</Notice>}
          </form>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={pending} onClick={remove}>Delete buyer</Button>
          </>
        }
      >
        Orders for this buyer are kept, but they will no longer show a buyer name.
      </Modal>
    </>
  );
}
