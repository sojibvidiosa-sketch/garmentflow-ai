import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
import { EmailComposer, type ComposerOrder } from "@/components/email/email-composer";
import { DATA_SOURCE, getReportData, getWorkspace, listEmailDrafts } from "@/lib/data";
import { totalQuantity } from "@/lib/domain/deadlines";
import { MILESTONE_LABEL, MILESTONE_ORDER } from "@/lib/domain/labels";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Email Composer" };
export const maxDuration = 60;

export default async function EmailPage() {
  const [{ orders, milestones, buyers }, { user, companyName }, drafts] = await Promise.all([getReportData(), getWorkspace(), listEmailDrafts()]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));

  // Only approved orders (not drafts / pending AI review) are offered as context.
  const options: ComposerOrder[] = orders
    .filter((o) => o.status !== "draft" && o.status !== "pending_review" && o.status !== "cancelled")
    .map((o) => {
      const next = milestones
        .filter((m) => m.poId === o.id && m.status !== "completed")
        .sort((a, b) => MILESTONE_ORDER.indexOf(a.key) - MILESTONE_ORDER.indexOf(b.key))[0];
      return {
        id: o.id,
        context: {
          poNumber: o.poNumber,
          buyerName: buyerName.get(o.buyerId) ?? "",
          styleNo: o.items[0]?.styleNo ?? "",
          description: o.items[0]?.description ?? "",
          quantity: formatNumber(totalQuantity(o)),
          shipDate: formatDate(o.shipDate),
          nextMilestone: next ? MILESTONE_LABEL[next.key] : null,
          senderName: user.fullName,
          companyName,
        },
      };
    });

  return (
    <>
      <PageHeader title="AI Email Composer" description="Draft professional follow-ups from approved order information. You always review and send emails yourself." />
      <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
        <EmailComposer orders={options} drafts={drafts} live={DATA_SOURCE === "live"} aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />
      </Suspense>
    </>
  );
}
