import type { Metadata } from "next";
import { PaymentReview } from "@/components/billing/payment-review";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminPayments } from "@/lib/data";
import { formatBdt } from "@/lib/plans";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminBillingPage() {
  const payments = await getAdminPayments();
  const pending = payments.filter((p) => p.status === "pending");
  const approved = payments.filter((p) => p.status === "approved");
  return (
    <>
      <PageHeader title="Payments" description="Manual bKash collection. Nothing is charged automatically; each payment is checked by a person." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Waiting for verification" value={pending.length} hint={pending.length ? "Check bKash statement" : "Clear"} tone={pending.length ? "yellow" : "green"} />
        <MetricCard label="Verified payments" value={approved.length} tone="neutral" />
        <MetricCard label="Verified amount" value={formatBdt(approved.reduce((s, p) => s + p.amountBdt, 0))} tone="neutral" />
      </div>
      <PaymentReview payments={payments} />
    </>
  );
}
