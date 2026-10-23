import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CompaniesTable } from "@/components/admin/admin-tables";
import { getAdminData } from "@/lib/data";

export const metadata: Metadata = { title: "Companies" };

export default async function AdminCompaniesPage() {
  const { companies } = await getAdminData();
  return (
    <>
      <PageHeader title="Company Management" description={`${companies.length} customer workspaces. Usage against plan limits; no order contents.`} />
      <Card><CardBody className="p-2.5"><CompaniesTable companies={companies} /></CardBody></Card>
    </>
  );
}
