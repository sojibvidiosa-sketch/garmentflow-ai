import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { TeamManager } from "@/components/team/team-manager";
import { getCompanySettings, getTeam, getWorkspace } from "@/lib/data";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const [team, { user }, settings] = await Promise.all([getTeam(), getWorkspace(), getCompanySettings()]);
  const active = team.members.filter((m) => m.status === "active").length;
  return (
    <>
      <PageHeader title="Team Management" description={`${active} active member${active === 1 ? "" : "s"} · ${settings.seatLimit} seats on your plan`} />
      <TeamManager team={team} currentUserId={user.id} isAdmin={user.role === "company_admin"} seatsLeft={Math.max(0, settings.seatLimit - settings.seatsUsed)} />
    </>
  );
}
