import type { PoRow } from "@/lib/data";
import type { PoStatus } from "@/lib/domain/types";

export type PoSortKey = "poNumber" | "buyerName" | "styleNo" | "quantity" | "shipDate" | "status";

export interface PoQuery {
  q: string;
  buyer: string;
  status: PoStatus | "";
  sort: PoSortKey;
  dir: "asc" | "desc";
}

/** Pure filter + sort, shared by the table and its tests. */
export function queryOrders(rows: PoRow[], { q, buyer, status, sort, dir }: PoQuery): PoRow[] {
  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!needle || [r.poNumber, r.buyerName, r.styleNo, r.description].some((v) => v.toLowerCase().includes(needle))) &&
      (!buyer || r.buyerName === buyer) &&
      (!status || r.status === status),
  );
  const sign = dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    const x = a[sort];
    const y = b[sort];
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sign;
  });
}
