"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/states";
import { completeMilestone, updateMilestone } from "@/lib/actions/work";
import { MILESTONE_LABEL, MILESTONE_STATUS, PRIORITY } from "@/lib/domain/labels";
import type { Milestone } from "@/lib/domain/types";

/** Edit dialog for one T&A milestone. Viewers get a read-only version. */
export function MilestoneEditor({
  milestone,
  poNumber,
  members,
  canEdit,
  onClose,
}: {
  milestone: Milestone | null;
  poNumber: string;
  members: { id: string; name: string }[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(milestone));
  const [lastId, setLastId] = useState(milestone?.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Reset the form when a different milestone is opened.
  if (milestone?.id !== lastId) {
    setLastId(milestone?.id);
    setForm(toForm(milestone));
    setErrors({});
    setMessage(null);
  }

  function save() {
    if (!milestone) return;
    start(async () => {
      const res = await updateMilestone({ id: milestone.id, ...form });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return setMessage({ ok: false, text: res.error });
      }
      router.refresh();
      onClose();
    });
  }

  function complete() {
    if (!milestone) return;
    start(async () => {
      const res = await completeMilestone(milestone.id);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal
      open={!!milestone}
      onClose={onClose}
      title={milestone ? `${poNumber} · ${MILESTONE_LABEL[milestone.key]}` : ""}
      footer={
        canEdit ? (
          <>
            {milestone?.status !== "completed" && (
              <Button variant="secondary" icon={<Check className="size-4" />} onClick={complete} disabled={pending}>Mark complete today</Button>
            )}
            <Button onClick={save} loading={pending}>Save changes</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )
      }
    >
      {milestone && (
        <fieldset disabled={!canEdit} className="grid grid-cols-2 gap-4">
          <Field label="Planned date" htmlFor="ms-planned" error={errors.plannedDate}>
            <Input id="ms-planned" type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
          </Field>
          <Field label="Actual date" htmlFor="ms-actual" error={errors.actualDate}>
            <Input id="ms-actual" type="date" value={form.actualDate} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} />
          </Field>
          <Field label="Status" htmlFor="ms-status">
            <Select id="ms-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Milestone["status"] })}>
              {Object.entries(MILESTONE_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="ms-priority">
            <Select id="ms-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Milestone["priority"] })}>
              {Object.entries(PRIORITY).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Assigned to" htmlFor="ms-assignee" className="col-span-2">
            <Select id="ms-assignee" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Notes" htmlFor="ms-notes" className="col-span-2">
            <Textarea id="ms-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Supplier updates, buyer comments…" />
          </Field>
          {message && <Notice tone={message.ok ? "success" : "error"} className="col-span-2">{message.text}</Notice>}
          {!canEdit && <p className="col-span-2 text-caption">Viewers can see milestones but not change them.</p>}
        </fieldset>
      )}
    </Modal>
  );
}

function toForm(m: Milestone | null) {
  return {
    plannedDate: m?.plannedDate ?? "",
    actualDate: m?.actualDate ?? "",
    status: m?.status ?? ("not_started" as Milestone["status"]),
    assigneeId: m?.assigneeId ?? "",
    priority: m?.priority ?? ("normal" as Milestone["priority"]),
    notes: m?.notes ?? "",
  };
}
