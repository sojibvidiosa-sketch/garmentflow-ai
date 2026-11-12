import type { Metadata } from "next";
import { BillingView } from "@/components/billing/billing-view";
import { PageHeader } from "@/components/ui/page-header";
import { getBilling, getWorkspace } from "@/lib/data";

export const metadata: Metadata = { title: "Plan & billing" };

export default async function BillingPage() {
  const [billing, { user }] = await Promise.all([getBilling(), getWorkspace()]);
  return (
    <>
      <PageHeader title="Plan & billing" description="Your plan, usage against its limits, and bKash payments." />
      <BillingView billing={billing} isAdmin={user.role === "company_admin"} />
    </>
  );
}
