import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsView } from "@/components/reports/reports-view";
import { getReportData, getWorkspace } from "@/lib/data";
import { buildReports } from "@/lib/reports";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [data, { companyName }] = await Promise.all([getReportData(), getWorkspace()]);
  const reports = buildReports(data);
  return (
    <>
      <PageHeader title="Reports & Order Summary" description={`${companyName} · figures as of ${formatDate(data.today)}, calculated from stored records.`} />
      <ReportsView reports={reports} today={data.today} />
    </>
  );
}
