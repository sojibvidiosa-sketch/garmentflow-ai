import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { PoForm } from "@/components/orders/po-form";
import { getWorkspace, listBuyers, listMembers } from "@/lib/data";
import { emptyItem } from "@/lib/validation/po";

export const metadata: Metadata = { title: "Create order" };

export default async function CreateOrderPage() {
  const [buyers, members, { user }] = await Promise.all([listBuyers(), listMembers(), getWorkspace()]);
  return (
    <>
      <PageHeader title="Create purchase order" description="Enter the order by hand. To read a buyer document with AI, use New Order / Upload instead." />
      <PoForm
        isNew
        buyers={buyers.map((b) => ({ id: b.id, name: b.name }))}
        members={members.map((m) => ({ id: m.id, name: m.fullName }))}
        initial={{
          poNumber: "",
          buyerId: "",
          season: "",
          status: "confirmed",
          orderDate: "",
          shipDate: "",
          currency: "USD",
          unitPrice: null,
          merchandiserId: user.id,
          notes: "",
          specialInstructions: "",
          items: [emptyItem()],
        }}
      />
    </>
  );
}
