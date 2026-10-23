import type { Metadata } from "next";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SubscriptionEditor } from "@/components/admin/subscription-editor";
import { getAdminData } from "@/lib/data";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const { companies } = await getAdminData();
  const count = (s: string) => companies.filter((c) => c.status === s).length;
  return (
    <>
      <PageHeader title="Subscription & Billing" description="Plans and limits per company. Billing is manual (invoice) during the pilot." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active" value={count("active")} tone="green" />
        <MetricCard label="On trial" value={count("trialing")} tone="blue" />
        <MetricCard label="Past due" value={count("past_due")} hint={count("past_due") ? "Follow up" : "Clear"} tone={count("past_due") ? "red" : "green"} />
        <MetricCard label="Cancelled" value={count("cancelled")} tone="neutral" />
      </div>
      <SubscriptionEditor companies={companies} />
    </>
  );
}
