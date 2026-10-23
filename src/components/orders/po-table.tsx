"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, FileSearch, Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Pagination, SortableTh, Table, Td, Th, Tr } from "@/components/ui/table";
import { PoStatusBadge } from "@/components/domain/status-badges";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { PoRow } from "@/lib/data";
import { PO_STATUS } from "@/lib/domain/labels";
import type { PoStatus } from "@/lib/domain/types";
import { queryOrders, type PoQuery, type PoSortKey } from "@/lib/orders-query";
import { formatDate, formatNumber } from "@/lib/utils";

const PAGE_SIZE = 10;

const COLUMNS: { key: PoSortKey; label: string; className?: string }[] = [
  { key: "poNumber", label: "PO number" },
  { key: "buyerName", label: "Buyer" },
  { key: "styleNo", label: "Style" },
  { key: "quantity", label: "Quantity", className: "text-right" },
  { key: "shipDate", label: "Ship date" },
  { key: "status", label: "Status" },
];

export function PoTable({ rows, buyers }: { rows: PoRow[]; buyers: string[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState<PoQuery>({
    q: params.get("q") ?? "",
    buyer: "",
    status: "",
    sort: "shipDate",
    dir: "asc",
  });
  const [page, setPage] = useState(1);

  const results = useMemo(() => queryOrders(rows, query), [rows, query]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtered = query.q || query.buyer || query.status;

  function update(patch: Partial<PoQuery>) {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  }

  function toggleSort(key: PoSortKey) {
    update({ sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc" });
  }

  function exportCsv() {
    const csv = toCsv(
      ["PO number", "Buyer", "Style", "Description", "Quantity (pcs)", "Ship date", "Status", "Merchandiser"],
      results.map((r) => [r.poNumber, r.buyerName, r.styleNo, r.description, r.quantity, r.shipDate, PO_STATUS[r.status].label, r.merchandiser]),
    );
    downloadCsv(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[340px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={query.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search PO number, buyer or style"
            aria-label="Search purchase orders"
            className="pl-9"
          />
        </div>
        <Select value={query.buyer} onChange={(e) => update({ buyer: e.target.value })} aria-label="Filter by buyer" className="w-[calc(50%-6px)] sm:w-44">
          <option value="">All buyers</option>
          {buyers.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Select>
        <Select value={query.status} onChange={(e) => update({ status: e.target.value as PoStatus | "" })} aria-label="Filter by status" className="w-[calc(50%-6px)] sm:w-44">
          <option value="">All statuses</option>
          {Object.entries(PO_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Button variant="secondary" className="sm:ml-auto" onClick={exportCsv} disabled={results.length === 0} icon={<Download className="size-4" />}>
          Export CSV
        </Button>
      </div>

      <Card className="p-2.5">
        {results.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No orders match these filters"
              description="Try a different PO number, buyer or status."
              action={<Button variant="secondary" onClick={() => { update({ q: "", buyer: "", status: "" }); router.replace("/orders"); }}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              icon={<FileSearch className="size-5" />}
              title="No purchase orders yet"
              description="Upload your first buyer document to begin."
              action={<ButtonLink href="/orders/new">Upload document</ButtonLink>}
            />
          )
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <SortableTh key={c.key} label={c.label} active={query.sort === c.key} dir={query.dir} onSort={() => toggleSort(c.key)} className={c.className} />
                  ))}
                  <Th className="hidden xl:table-cell">Merchandiser</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/orders/${r.id}`)}>
                    <Td className="font-semibold">
                      <Link href={`/orders/${r.id}`} className="hover:text-violet" onClick={(e) => e.stopPropagation()}>
                        {r.poNumber}
                      </Link>
                    </Td>
                    <Td>{r.buyerName}</Td>
                    <Td>
                      <span className="font-medium">{r.styleNo}</span>
                      <span className="block text-caption text-secondary">{r.description}</span>
                    </Td>
                    <Td className="text-right tabular-nums">{formatNumber(r.quantity)} pcs</Td>
                    <Td className="tabular-nums">{formatDate(r.shipDate)}</Td>
                    <Td><PoStatusBadge status={r.status} /></Td>
                    <Td className="hidden text-secondary xl:table-cell">{r.merchandiser}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={current} pageCount={pageCount} total={results.length} pageSize={PAGE_SIZE} onPage={setPage} noun="orders" />
          </>
        )}
      </Card>
    </>
  );
}
