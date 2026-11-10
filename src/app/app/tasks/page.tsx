import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { MyTasks, type WorkMilestone } from "@/components/tasks/my-tasks";
import { getReportData, getWorkspace, listTasks } from "@/lib/data";
import { deadlineState } from "@/lib/domain/deadlines";

export const metadata: Metadata = { title: "My Tasks" };

export default async function TasksPage() {
  const [{ orders, milestones, members, today }, { user }, tasks] = await Promise.all([getReportData(), getWorkspace(), listTasks()]);
  const active = new Map(orders.filter((o) => o.status !== "shipped" && o.status !== "cancelled").map((o) => [o.id, o.poNumber]));
  const mine: WorkMilestone[] = milestones
    .filter((m) => m.assigneeId === user.id && m.status !== "completed" && active.has(m.poId))
    .map((m) => ({ ...m, state: deadlineState(m, today), poNumber: active.get(m.poId)! }));
  const myTasks = tasks.filter((t) => t.assigneeId === user.id);

  return (
    <>
      <PageHeader title="My Tasks" description={`Everything assigned to ${user.fullName.split(" ")[0]}, most urgent first.`} />
      <MyTasks
        milestones={mine}
        tasks={myTasks}
        orders={[...active].map(([id, poNumber]) => ({ id, poNumber }))}
        members={members.map((m) => ({ id: m.id, name: m.fullName }))}
        today={today}
        canEdit={user.role !== "viewer"}
      />
    </>
  );
}
