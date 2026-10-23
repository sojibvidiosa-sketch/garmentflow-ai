import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
import { ReviewWorkspace } from "@/components/orders/review-workspace";
import { getSampleExtraction } from "@/lib/data";

export const metadata: Metadata = { title: "AI Extraction & Review" };

export function generateStaticParams() {
  return [{ jobId: "sample" }];
}

async function Review({ params }: { params: PageProps<"/orders/review/[jobId]">["params"] }) {
  const { jobId } = await params;
  // Phase 1 only has the built-in sample. Phase 4 loads the job's stored
  // extraction result (scoped to the user's company) by id.
  if (jobId !== "sample") notFound();
  const extraction = await getSampleExtraction();
  return <ReviewWorkspace extraction={extraction} />;
}

export default function ReviewPage({ params }: PageProps<"/orders/review/[jobId]">) {
  return (
    <>
      <PageHeader
        title="AI Extraction & Review"
        eyebrow={<Badge tone="yellow">Sample document — not a real AI result</Badge>}
        description="Check every suggested value against the original document before approving."
      />
      <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-card" />}>
        <Review params={params} />
      </Suspense>
    </>
  );
}
