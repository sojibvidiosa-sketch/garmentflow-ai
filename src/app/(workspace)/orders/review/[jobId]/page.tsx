import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Notice, Skeleton } from "@/components/ui/states";
import { ReviewWorkspace } from "@/components/orders/review-workspace";
import { getExtraction, getSampleExtraction, listBuyers } from "@/lib/data";

export const metadata: Metadata = { title: "AI Extraction & Review" };
export const maxDuration = 60;

export function generateStaticParams() {
  return [{ jobId: "sample" }];
}

async function Review({ params }: { params: PageProps<"/orders/review/[jobId]">["params"] }) {
  const { jobId } = await params;
  if (jobId === "sample") {
    return (
      <>
        <PageHeader
          title="AI Extraction & Review"
          eyebrow={<Badge tone="yellow">Sample document, not a real AI result</Badge>}
          description="Check every suggested value against the original document before approving."
        />
        <ReviewWorkspace extraction={await getSampleExtraction()} jobId={null} />
      </>
    );
  }

  const [found, buyers] = await Promise.all([getExtraction(jobId), listBuyers()]);
  if (!found) notFound();
  if (found.status === "approved" && found.poId) redirect(`/orders/${found.poId}`);
  return (
    <>
      <PageHeader
        title="AI Extraction & Review"
        eyebrow={<Badge tone="violet">AI suggestion: review before saving</Badge>}
        description="AI can make mistakes. Check every value against the original document. Nothing is saved until you approve."
      />
      {found.status === "rejected" ? (
        <Notice tone="warning" title="This extraction was discarded">
          The document is still in the <Link href="/documents" className="font-semibold underline">document center</Link>, where you can run extraction again.
        </Notice>
      ) : (
        <ReviewWorkspace extraction={found.extraction} jobId={jobId} buyers={buyers.map((b) => ({ id: b.id, name: b.name }))} />
      )}
    </>
  );
}

export default function ReviewPage({ params }: PageProps<"/orders/review/[jobId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-card" />}>
      <Review params={params} />
    </Suspense>
  );
}
