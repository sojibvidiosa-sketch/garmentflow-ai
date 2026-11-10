import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentCenter } from "@/components/documents/document-center";
import { getWorkspace, listDocuments, listPurchaseOrders } from "@/lib/data";

export const metadata: Metadata = { title: "Document Center" };
/** "Read with AI" runs here and can take up to a minute. */
export const maxDuration = 60;

export default async function DocumentsPage() {
  const [documents, orders, { user }] = await Promise.all([listDocuments(), listPurchaseOrders(), getWorkspace()]);
  return (
    <>
      <PageHeader title="Document Center" description="Buyer POs, tech packs and other files, stored privately for your company." />
      <DocumentCenter
        documents={documents}
        orders={orders.map((o) => ({ id: o.id, poNumber: o.poNumber }))}
        canDelete={user.role === "company_admin" || user.role === "merch_manager"}
      />
    </>
  );
}
