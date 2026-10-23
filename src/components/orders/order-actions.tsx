"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import { createTnaPlan, deletePurchaseOrder, updatePoStatus } from "@/lib/actions/orders";
import { PO_STATUS } from "@/lib/domain/labels";
import type { PoStatus } from "@/lib/domain/types";

function useResult() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return [msg, setMsg] as const;
}

export function StatusControl({ id, status }: { id: string; status: PoStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [msg, setMsg] = useResult();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        aria-label="Order status"
        value={value}
        disabled={pending}
        className="h-10 w-44"
        onChange={(e) => {
          const next = e.target.value as PoStatus;
          const previous = value;
          setValue(next);
          start(async () => {
            const res = await updatePoStatus(id, next);
            if (!res.ok) setValue(previous);
            setMsg({ ok: res.ok, text: res.ok ? (res.message ?? "Saved") : res.error });
            if (res.ok) router.refresh();
          });
        }}
      >
        {Object.entries(PO_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
      </Select>
      {msg && <p className={`max-w-72 text-right text-caption ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>}
    </div>
  );
}

export function CreatePlanButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useResult();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        icon={<ListPlus className="size-4" />}
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await createTnaPlan(poId);
            setMsg({ ok: res.ok, text: res.ok ? (res.message ?? "Plan created.") : res.error });
            if (res.ok) router.refresh();
          })
        }
      >
        Create T&A plan from template
      </Button>
      {msg && <Notice tone={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
    </div>
  );
}

export function DeleteOrderButton({ id, poNumber }: { id: string; poNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)}>Delete</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${poNumber}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Keep order</Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deletePurchaseOrder(id);
                  if (!res.ok) return setError(res.error);
                  router.push("/orders");
                })
              }
            >
              Delete order
            </Button>
          </>
        }
      >
        <p>The order, its styles, T&A milestones and tasks are removed permanently. Documents stay in the document center.</p>
        {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      </Modal>
    </>
  );
}
