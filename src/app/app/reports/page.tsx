import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsView } from "@/components/reports/reports-view";
import { DATA_SOURCE, getReportData, getWorkspace } from "@/lib/data";
import { buildReports } from "@/lib/reports";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };
export const maxDuration = 60;

export default async function ReportsPage() {
  const [data, { companyName }] = await Promise.all([getReportData(), getWorkspace()]);
  const reports = buildReports(data);
  return (
    <>
      <PageHeader title="Reports & Order Summary" description={`${companyName} · figures as of ${formatDate(data.today)}, calculated from stored records.`} />
      <ReportsView
        reports={reports}
        today={data.today}
        aiAvailable={DATA_SOURCE === "live" && Boolean(process.env.OPENAI_API_KEY)}
        aiNote={DATA_SOURCE !== "live" ? "AI summaries work in your own workspace." : process.env.OPENAI_API_KEY ? "Let AI describe these figures in plain language." : "AI summaries are switched off until an OpenAI key is added."}
      />
    </>
  );
}
