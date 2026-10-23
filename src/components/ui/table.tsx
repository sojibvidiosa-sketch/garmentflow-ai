"use client";

import type { ComponentProps, ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Data table primitives, styled after Figma "Data table" on Screen 08. */
export function Table({ className, children, ...props }: ComponentProps<"table">) {
  return (
    // `relative` keeps visually-hidden header labels inside the scroll area.
    <div className="relative overflow-x-auto">
      <table className={cn("w-full min-w-[720px] border-separate border-spacing-0 text-[13px]", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, children, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "bg-subtle px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-secondary uppercase first:rounded-l-md last:rounded-r-md",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export type SortDir = "asc" | "desc";

export function SortableTh({
  label,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onSort: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Th className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={onSort} className="inline-flex items-center gap-1 uppercase hover:text-ink">
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
      </button>
    </Th>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-border px-4 py-3.5 text-ink", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-[#fafbfb]", className)} {...props} />;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  noun = "results",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  noun?: string;
}): ReactNode {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-caption text-secondary">
      <p>
        Showing <span className="font-medium text-ink">{from}–{to}</span> of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="grid size-8 place-items-center rounded-control border border-border bg-surface hover:bg-subtle disabled:opacity-40"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-control border border-border bg-surface hover:bg-subtle disabled:opacity-40"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
