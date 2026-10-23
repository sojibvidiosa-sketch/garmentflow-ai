"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { BreakdownEditor } from "./breakdown-editor";
import { savePurchaseOrder } from "@/lib/actions/orders";
import { PO_STATUS } from "@/lib/domain/labels";
import { emptyItem, poSchema, type PoInput } from "@/lib/validation/po";

interface Option {
  id: string;
  name: string;
}

export function PoForm({ initial, buyers, members, isNew }: { initial: PoInput; buyers: Option[]; members: Option[]; isNew: boolean }) {
  const router = useRouter();
  const [po, setPo] = useState<PoInput>(initial);
  const [createPlan, setCreatePlan] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ tone: "error" | "success" | "warning"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof PoInput>(key: K, value: PoInput[K]) => setPo((p) => ({ ...p, [key]: value }));
  const setItem = (index: number, patch: Partial<PoInput["items"][number]>) =>
    setPo((p) => ({ ...p, items: p.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  function submit() {
    const parsed = poSchema.safeParse(po);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setResult({ tone: "error", text: "Check the highlighted fields." });
      return;
    }
    setErrors({});
    start(async () => {
      const res = await savePurchaseOrder(parsed.data, { createPlan: isNew && createPlan });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setResult({ tone: "error", text: res.error });
        return;
      }
      setResult({ tone: res.message?.includes("could not") ? "warning" : "success", text: res.message ?? "Saved." });
      router.push(`/orders/${res.data}`);
    });
  }

  const err = (k: string) => errors[k];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="space-y-6"
    >
      <Card>
        <CardHeader title="Order information" />
        <CardBody className="grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="PO number" htmlFor="poNumber" required error={err("poNumber")}>
            <Input id="poNumber" value={po.poNumber} onChange={(e) => set("poNumber", e.target.value)} placeholder="PO-2026-1101" aria-invalid={!!err("poNumber")} />
          </Field>
          <Field label="Buyer" htmlFor="buyerId" hint={<Link href="/buyers" className="text-violet hover:underline">Manage buyers</Link>}>
            <Select id="buyerId" value={po.buyerId} onChange={(e) => set("buyerId", e.target.value)}>
              <option value="">Select buyer…</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Season" htmlFor="season">
            <Input id="season" value={po.season} onChange={(e) => set("season", e.target.value)} placeholder="SS27" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" value={po.status} onChange={(e) => set("status", e.target.value as PoInput["status"])}>
              {Object.entries(PO_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Order date" htmlFor="orderDate" error={err("orderDate")}>
            <Input id="orderDate" type="date" value={po.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
          </Field>
          <Field label="Ship date" htmlFor="shipDate" required error={err("shipDate")}>
            <Input id="shipDate" type="date" value={po.shipDate} onChange={(e) => set("shipDate", e.target.value)} aria-invalid={!!err("shipDate")} />
          </Field>
          <Field label="Unit price" htmlFor="unitPrice" error={err("unitPrice")}>
            <div className="flex gap-2">
              <Select aria-label="Currency" value={po.currency} onChange={(e) => set("currency", e.target.value as PoInput["currency"])} className="w-24">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </Select>
              <Input
                id="unitPrice"
                inputMode="decimal"
                value={po.unitPrice ?? ""}
                onChange={(e) => set("unitPrice", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="6.40"
              />
            </div>
          </Field>
          <Field label="Merchandiser" htmlFor="merchandiserId">
            <Select id="merchandiserId" value={po.merchandiserId} onChange={(e) => set("merchandiserId", e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {po.items.map((item, i) => (
        <Card key={i}>
          <CardHeader
            title={`Style ${i + 1}${item.styleNo ? ` · ${item.styleNo}` : ""}`}
            action={
              po.items.length > 1 && (
                <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => set("items", po.items.filter((_, j) => j !== i))}>
                  Remove style
                </Button>
              )
            }
          />
          <CardBody className="space-y-5">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Style number" htmlFor={`style-${i}`} required error={err(`items.${i}.styleNo`)}>
                <Input id={`style-${i}`} value={item.styleNo} onChange={(e) => setItem(i, { styleNo: e.target.value })} placeholder="PLS-48" aria-invalid={!!err(`items.${i}.styleNo`)} />
              </Field>
              <Field label="Product description" htmlFor={`desc-${i}`} className="xl:col-span-2">
                <Input id={`desc-${i}`} value={item.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Men's short sleeve polo" />
              </Field>
              <Field label="GSM" htmlFor={`gsm-${i}`} error={err(`items.${i}.gsm`)}>
                <Input id={`gsm-${i}`} inputMode="numeric" value={item.gsm ?? ""} onChange={(e) => setItem(i, { gsm: e.target.value === "" ? null : Math.round(Number(e.target.value)) })} placeholder="220" />
              </Field>
              <Field label="Fabric composition" htmlFor={`fabric-${i}`} className="sm:col-span-2 xl:col-span-4">
                <Input id={`fabric-${i}`} value={item.fabric} onChange={(e) => setItem(i, { fabric: e.target.value })} placeholder="100% Cotton Piqué" />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-caption font-medium text-secondary">Colour / size breakdown (pcs)</p>
              <BreakdownEditor idPrefix={`item-${i}`} colors={item.colors} onChange={(colors) => setItem(i, { colors })} />
              {Object.entries(errors).find(([k]) => k.startsWith(`items.${i}.colors`)) && (
                <p className="mt-1 text-caption text-red">{Object.entries(errors).find(([k]) => k.startsWith(`items.${i}.colors`))![1]}</p>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
      <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => set("items", [...po.items, emptyItem()])}>
        Add another style
      </Button>

      <Card>
        <CardHeader title="Notes & instructions" />
        <CardBody className="grid gap-5 md:grid-cols-2">
          <Field label="Special instructions (from buyer)" htmlFor="specialInstructions">
            <Textarea id="specialInstructions" value={po.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)} placeholder="Packing, labelling, testing requirements…" />
          </Field>
          <Field label="Internal notes" htmlFor="notes">
            <Textarea id="notes" value={po.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Visible to your team only" />
          </Field>
        </CardBody>
      </Card>

      {result && <Notice tone={result.tone}>{result.text}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isNew ? (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={createPlan} onChange={(e) => setCreatePlan(e.target.checked)} className="size-4 accent-violet" />
            Create a T&A plan from the standard template (dates stay editable)
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={pending} icon={<Save className="size-4" />}>{isNew ? "Create order" : "Save changes"}</Button>
        </div>
      </div>
    </form>
  );
}
