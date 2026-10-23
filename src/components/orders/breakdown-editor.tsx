"use client";

import { Fragment, useState } from "react";
import { Plus, X } from "lucide-react";
import type { ColorBreakdown } from "@/lib/domain/types";
import { cn, formatNumber } from "@/lib/utils";

/** Editable colour × size quantity grid. All colours share the same sizes. */
export function BreakdownEditor({
  colors,
  onChange,
  idPrefix,
  readOnly = false,
}: {
  colors: ColorBreakdown[];
  onChange: (colors: ColorBreakdown[]) => void;
  idPrefix: string;
  readOnly?: boolean;
}) {
  const sizes = colors[0]?.sizes.map((s) => s.size) ?? [];
  const [newSize, setNewSize] = useState("");
  const total = colors.reduce((sum, c) => sum + c.sizes.reduce((s, x) => s + x.qty, 0), 0);

  const setQty = (ci: number, si: number, qty: number) =>
    onChange(colors.map((c, i) => (i !== ci ? c : { ...c, sizes: c.sizes.map((s, j) => (j === si ? { ...s, qty } : s)) })));
  const setColor = (ci: number, color: string) => onChange(colors.map((c, i) => (i === ci ? { ...c, color } : c)));
  const addColor = () => onChange([...colors, { color: "", sizes: sizes.map((size) => ({ size, qty: 0 })) }]);
  const removeColor = (ci: number) => onChange(colors.filter((_, i) => i !== ci));
  const addSize = () => {
    const size = newSize.trim();
    if (!size || sizes.includes(size)) return;
    onChange(colors.map((c) => ({ ...c, sizes: [...c.sizes, { size, qty: 0 }] })));
    setNewSize("");
  };
  const removeSize = (si: number) => onChange(colors.map((c) => ({ ...c, sizes: c.sizes.filter((_, j) => j !== si) })));

  return (
    <div>
      <div className="overflow-x-auto rounded-control border border-border">
        <div className="grid min-w-[480px]" style={{ gridTemplateColumns: `minmax(120px,1.4fr) repeat(${sizes.length}, minmax(64px,1fr)) 84px ${readOnly ? "" : "36px"}` }}>
          <div className="bg-subtle px-3 py-2 text-[11px] font-semibold text-secondary uppercase">Colour</div>
          {sizes.map((s, si) => (
            <div key={s} className="flex items-center justify-between gap-1 bg-subtle px-3 py-2 text-[11px] font-semibold text-secondary">
              {s}
              {!readOnly && sizes.length > 1 && (
                <button type="button" onClick={() => removeSize(si)} className="rounded p-0.5 text-muted hover:text-red" aria-label={`Remove size ${s}`}>
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
          <div className="bg-subtle px-3 py-2 text-right text-[11px] font-semibold text-secondary">Total</div>
          {!readOnly && <div className="bg-subtle" />}
          {colors.map((c, ci) => (
            <Fragment key={ci}>
              <div className="border-t border-border px-1.5 py-1.5">
                <input
                  id={`${idPrefix}-color-${ci}`}
                  value={c.color}
                  readOnly={readOnly}
                  onChange={(e) => setColor(ci, e.target.value)}
                  placeholder="e.g. Navy"
                  aria-label={`Colour ${ci + 1} name`}
                  className={cn("h-8 w-full rounded-md border border-transparent px-1.5 text-[13px] font-medium hover:border-border focus:border-violet focus:outline-none", !c.color.trim() && "border-red/40 bg-red-light/40")}
                />
              </div>
              {c.sizes.map((s, si) => (
                <div key={s.size} className="border-t border-border px-1.5 py-1.5">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={s.qty}
                    readOnly={readOnly}
                    onChange={(e) => setQty(ci, si, Math.max(0, Math.round(Number(e.target.value) || 0)))}
                    aria-label={`${c.color || `Colour ${ci + 1}`} ${s.size} quantity`}
                    className="h-8 w-full rounded-md border border-transparent px-1.5 text-[13px] tabular-nums hover:border-border focus:border-violet focus:outline-none"
                  />
                </div>
              ))}
              <div className="border-t border-border px-3 py-2 text-right text-[13px] font-semibold tabular-nums">
                {formatNumber(c.sizes.reduce((sum, s) => sum + s.qty, 0))}
              </div>
              {!readOnly && (
                <div className="grid place-items-center border-t border-border">
                  <button type="button" onClick={() => removeColor(ci)} className="rounded p-1 text-muted hover:bg-red-light hover:text-red" aria-label={`Remove colour ${c.color || ci + 1}`}>
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={addColor} className="inline-flex items-center gap-1 rounded-control px-2 py-1.5 text-caption font-semibold text-violet hover:bg-violet-light">
              <Plus className="size-3.5" /> Add colour
            </button>
            <span className="flex items-center gap-1">
              <input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                placeholder="New size"
                aria-label="New size name"
                className="h-8 w-24 rounded-md border border-border px-2 text-caption focus:border-violet focus:outline-none"
              />
              <button type="button" onClick={addSize} className="inline-flex items-center gap-1 rounded-control px-2 py-1.5 text-caption font-semibold text-violet hover:bg-violet-light">
                <Plus className="size-3.5" /> Add size
              </button>
            </span>
          </div>
        ) : (
          <span />
        )}
        <p className="text-caption font-semibold tabular-nums">Total {formatNumber(total)} pcs</p>
      </div>
    </div>
  );
}
