import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { JobsTable } from "@/components/admin/admin-tables";
import { getAdminData } from "@/lib/data";

export const metadata: Metadata = { title: "Processing Jobs" };

export default async function AdminJobsPage() {
  const { jobs } = await getAdminData();
  const failed = jobs.filter((j) => j.status === "failed");
  const running = jobs.filter((j) => j.status === "processing" || j.status === "queued");
  return (
    <>
      <PageHeader title="Document Processing Monitor" description="Every AI request across companies: status, tokens, cost and error reason." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Jobs shown" value={jobs.length} tone="neutral" />
        <MetricCard label="Failed" value={failed.length} hint={failed.length ? "Follow up" : "Clear"} tone={failed.length ? "red" : "green"} />
        <MetricCard label="Still running" value={running.length} hint={running.length ? "Check if stuck" : "None"} tone={running.length ? "yellow" : "green"} />
      </div>
      {failed.length > 0 && (
        <Card className="mb-6">
          <CardBody className="p-2.5">
            <p className="px-2 pt-2 pb-3 text-[13px] font-semibold text-red">Failed jobs</p>
            <JobsTable jobs={failed} />
          </CardBody>
        </Card>
      )}
      <Card><CardBody className="p-2.5"><JobsTable jobs={jobs} /></CardBody></Card>
    </>
  );
}
