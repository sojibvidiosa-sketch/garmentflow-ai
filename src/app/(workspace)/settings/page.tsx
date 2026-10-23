import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForms } from "@/components/settings/settings-forms";
import { getCompanySettings, getWorkspace } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, { user }] = await Promise.all([getCompanySettings(), getWorkspace()]);
  return (
    <>
      <PageHeader title="Company Settings" description="Your company profile, plan usage and account security." />
      <SettingsForms settings={settings} fullName={user.fullName} email={user.email} isAdmin={user.role === "company_admin"} />
    </>
  );
}
