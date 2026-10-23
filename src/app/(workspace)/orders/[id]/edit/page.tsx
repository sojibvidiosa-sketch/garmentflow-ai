import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
import { PoForm } from "@/components/orders/po-form";
import { getPurchaseOrder, listBuyers, listMembers } from "@/lib/data";
import { purchaseOrders as demoOrders } from "@/lib/demo/data";
import { toPoInput } from "@/lib/validation/po";

export const metadata: Metadata = { title: "Edit order" };

export function generateStaticParams() {
  return demoOrders.map((po) => ({ id: po.id }));
}

async function Editor({ params }: { params: PageProps<"/orders/[id]/edit">["params"] }) {
  const { id } = await params;
  const [data, buyers, members] = await Promise.all([getPurchaseOrder(id), listBuyers(), listMembers()]);
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit ${data.po.poNumber}`} description="Changes are recorded in the order's activity history." />
      <PoForm
        isNew={false}
        initial={toPoInput(data.po)}
        buyers={buyers.map((b) => ({ id: b.id, name: b.name }))}
        members={members.map((m) => ({ id: m.id, name: m.fullName }))}
      />
    </>
  );
}

export default function EditOrderPage({ params }: PageProps<"/orders/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-[720px] w-full rounded-card" />}>
      <Editor params={params} />
    </Suspense>
  );
}
