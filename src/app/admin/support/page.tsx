import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminData } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Support & Logs" };

const TARGET: Record<string, string> = {
  purchase_orders: "purchase order",
  milestones: "T&A milestone",
  companies: "workspace",
  subscriptions: "subscription",
};
const ACTION: Record<string, string> = { insert: "created", update: "updated", create: "created", delete: "deleted" };

export default async function AdminSupportPage() {
  const { activity, leads } = await getAdminData();
  return (
    <>
      <PageHeader title="Support & Audit Logs" description="Demo requests from the website and platform activity (what happened and when, without order contents)." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Demo requests" description={`${leads.length} from the website contact form`} />
          <CardBody className="space-y-3 pt-3">
            {leads.length === 0 && <p className="text-[13px] text-secondary">No demo requests yet.</p>}
            {leads.map((l) => (
              <div key={l.id} className="rounded-control border border-border p-3 text-[13px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{l.company}</p>
                  <p className="text-caption text-secondary">{formatDateTime(l.createdAt)}</p>
                </div>
                <p className="mt-1 text-secondary">
                  {l.fullName} · <span className="select-all">{l.email}</span>
                  {l.phone && <> · <span className="select-all">{l.phone}</span></>}
                  {l.teamSize && <> · {l.teamSize}</>}
                </p>
                {l.message && <p className="mt-2">{l.message}</p>}
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Platform activity" description="Most recent first" />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border">
              {activity.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-[13px]">
                  <span>
                    <span className="font-medium">{a.companyName ?? "Platform"}</span>{" "}
                    <span className="text-secondary">{ACTION[a.action] ?? a.action} a {TARGET[a.targetType] ?? a.targetType.replace("_", " ")}</span>
                  </span>
                  <span className="text-caption text-secondary">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
            {activity.length === 0 && <p className="text-[13px] text-secondary">No activity yet.</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
