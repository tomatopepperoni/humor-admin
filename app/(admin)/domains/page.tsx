import type { Metadata } from "next";
import CrudPage from "../_crud/CrudPage";
import GateStatus from "../_crud/GateStatus";

export const metadata: Metadata = { title: "Signup domains" };
export const dynamic = "force-dynamic";

export default async function DomainsPage({ searchParams }: PageProps<"/domains">) {
  return (
    <CrudPage resource="domains" searchParams={await searchParams}>
      <GateStatus />
    </CrudPage>
  );
}
