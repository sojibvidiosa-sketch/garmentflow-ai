import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { UploadPanel } from "@/components/orders/upload-panel";

export const metadata: Metadata = { title: "New Order" };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="New Order / Document Upload" description="Upload a buyer PO or tech pack, or paste a buyer email. AI suggests the fields — you review and approve them." />
      <UploadPanel />
    </>
  );
}
