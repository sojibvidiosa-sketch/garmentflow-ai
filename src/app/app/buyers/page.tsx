import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { BuyersManager, type BuyerRow } from "@/components/buyers/buyers-manager";
import { getReportData, getWorkspace } from "@/lib/data";
import { totalQuantity } from "@/lib/domain/deadlines";

export const metadata: Metadata = { title: "Buyers" };

export default async function BuyersPage() {
  const [{ orders, buyers }, { user }] = await Promise.all([getReportData(), getWorkspace()]);
  const rows: BuyerRow[] = buyers.map((b) => {
    const mine = orders.filter((o) => o.buyerId === b.id && o.status !== "cancelled");
    return {
      id: b.id,
      name: b.name,
      country: b.country,
      contactEmail: b.contactEmail,
      totalOrders: mine.length,
      activeOrders: mine.filter((o) => o.status !== "shipped").length,
      quantity: mine.reduce((s, o) => s + totalQuantity(o), 0),
    };
  });

  return (
    <>
      <PageHeader title="Buyer Directory" description={`${buyers.length} buyers · brands and retailers your team places orders for`} />
      <BuyersManager buyers={rows} canDelete={user.role === "company_admin" || user.role === "merch_manager"} />
    </>
  );
}
