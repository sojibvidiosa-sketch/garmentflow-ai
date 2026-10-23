import type { Metadata } from "next";
import { Suspense } from "react";
import { PenLine, Upload } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
import { PoTable } from "@/components/orders/po-table";
import { listBuyers, listPurchaseOrders } from "@/lib/data";

export const metadata: Metadata = { title: "Purchase Orders" };

export default async function OrdersPage() {
  const [rows, buyers] = await Promise.all([listPurchaseOrders(), listBuyers()]);
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description={`${rows.length} orders in this workspace`}
        actions={
          <>
            <ButtonLink href="/orders/create" variant="secondary" icon={<PenLine className="size-4" />}>Create manually</ButtonLink>
            <ButtonLink href="/orders/new" icon={<Upload className="size-4" />}>Upload buyer document</ButtonLink>
          </>
        }
      />
      {/* PoTable reads ?q= from the URL, which is request-time data. */}
      <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
        <PoTable rows={rows} buyers={buyers.map((b) => b.name)} />
      </Suspense>
    </>
  );
}
