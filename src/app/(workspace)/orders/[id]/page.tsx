import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, FileText, Mail, Pencil } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CreatePlanButton, DeleteOrderButton, StatusControl } from "@/components/orders/order-actions";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { PoStatusBadge } from "@/components/domain/status-badges";
import { getPurchaseOrder, getToday, getWorkspace, listMembers } from "@/lib/data";
import { purchaseOrders as demoOrders } from "@/lib/demo/data";
import { deadlineState } from "@/lib/domain/deadlines";
import { MILESTONE_ORDER } from "@/lib/domain/labels";
import { formatBytes } from "@/lib/upload-rules";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Purchase Order" };

/**
 * Prerenders the demo orders (needed for the static demo site). Real orders
 * are read per request, after the session is known.
 */
export function generateStaticParams() {
  return demoOrders.map((po) => ({ id: po.id }));
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-secondary">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  const [data, members, { user }] = await Promise.all([getPurchaseOrder(id), listMembers(), getWorkspace()]);
  if (!data) notFound();
  const { po, buyer, merchandiser, milestones, documents, activity, quantity } = data;
  const today = await getToday();
  const memberName = (uid: string | null) => members.find((m) => m.id === uid)?.fullName ?? "Unassigned";
  const ordered = [...milestones].sort((a, b) => MILESTONE_ORDER.indexOf(a.key) - MILESTONE_ORDER.indexOf(b.key));
  const done = milestones.filter((m) => m.status === "completed").length;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/orders" className="inline-flex items-center gap-1 text-caption font-medium text-secondary hover:text-ink">
            <ArrowLeft className="size-3.5" /> Purchase orders
          </Link>
        }
        title={po.poNumber}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {buyer?.name ?? "No buyer"} · {po.items[0]?.description} · {formatNumber(quantity)} pcs <PoStatusBadge status={po.status} />
          </span>
        }
        actions={
          <>
            <StatusControl id={po.id} status={po.status} />
            <ButtonLink href={`/email?po=${po.id}`} variant="secondary" icon={<Mail className="size-4" />}>Draft email</ButtonLink>
            <ButtonLink href={`/orders/${po.id}/edit`} icon={<Pencil className="size-4" />}>Edit order</ButtonLink>
            <DeleteOrderButton id={po.id} poNumber={po.poNumber} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Order information" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                <Info label="Buyer" value={buyer?.name} />
                <Info label="Country" value={buyer?.country} />
                <Info label="Season" value={po.season} />
                <Info label="Merchandiser" value={merchandiser?.fullName} />
                <Info label="Order date" value={formatDate(po.orderDate)} />
                <Info label="Ship date" value={formatDate(po.shipDate)} />
                <Info label="Unit price" value={po.unitPrice !== null ? `${po.currency} ${po.unitPrice.toFixed(2)}` : <span className="text-red">Not confirmed</span>} />
                <Info label="Total quantity" value={`${formatNumber(quantity)} pcs`} />
              </dl>
            </CardBody>
          </Card>

          {po.items.map((item) => {
            const sizes = item.colors[0]?.sizes.map((s) => s.size) ?? [];
            return (
              <Card key={item.id}>
                <CardHeader title={`Style ${item.styleNo}`} description={`${item.description} · ${item.fabric}${item.gsm ? ` · ${item.gsm} GSM` : ""}`} />
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] font-semibold text-secondary uppercase">
                          <th className="bg-subtle px-3 py-2 first:rounded-l-md">Colour</th>
                          {sizes.map((s) => <th key={s} className="bg-subtle px-3 py-2 text-right">{s}</th>)}
                          <th className="rounded-r-md bg-subtle px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.colors.map((c) => (
                          <tr key={c.color} className="border-b border-border">
                            <td className="px-3 py-2.5 font-medium">{c.color}</td>
                            {c.sizes.map((s) => <td key={s.size} className="px-3 py-2.5 text-right tabular-nums">{formatNumber(s.qty)}</td>)}
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber(c.sizes.reduce((t, s) => t + s.qty, 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardHeader
              title="Time & Action plan"
              description={milestones.length ? `${done} of ${milestones.length} milestones completed` : undefined}
              action={milestones.length > 0 && <Link href="/tna" className="text-caption font-semibold text-violet hover:underline">Open T&A tracker</Link>}
            />
            <CardBody>
              {ordered.length === 0 ? (
                <EmptyState
                  title="No T&A plan yet"
                  description="Create the standard garment plan from this order's ship date. You can adjust every date afterwards."
                  action={po.shipDate ? <CreatePlanButton poId={po.id} /> : <p className="text-caption text-red">Add a ship date first (Edit order).</p>}
                />
              ) : (
                <OrderTimeline
                  milestones={ordered.map((m) => ({ ...m, state: deadlineState(m, today) }))}
                  poNumber={po.poNumber}
                  members={members.map((m) => ({ id: m.id, name: m.fullName }))}
                  canEdit={user.role !== "viewer"}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Documents" />
            <CardBody className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-[13px] text-secondary">No documents attached.</p>
              ) : (
                documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-control border border-border p-3">
                    <FileText className="size-4 shrink-0 text-violet" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{d.fileName}</p>
                      <p className="text-caption text-secondary">{d.kind.replace("_", " ")} · {formatBytes(d.sizeBytes)}</p>
                    </div>
                  </div>
                ))
              )}
              <Link href="/documents" className="block pt-1 text-caption font-semibold text-violet hover:underline">Open document center</Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes & instructions" />
            <CardBody className="space-y-4 text-[13px]">
              <div>
                <p className="text-caption text-secondary">Special instructions</p>
                <p className="mt-1">{po.specialInstructions || "—"}</p>
              </div>
              <div>
                <p className="text-caption text-secondary">Internal notes</p>
                <p className="mt-1">{po.notes || "—"}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-[13px] text-secondary">No recent activity.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="text-[13px]">
                      <span className="font-semibold">{memberName(a.actorId)}</span> <span className="text-secondary">{a.action}</span>
                      <span className="block text-caption text-muted">{formatDateTime(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[720px] w-full rounded-card" />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}
