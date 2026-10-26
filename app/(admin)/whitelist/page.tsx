import type { Metadata } from "next";
import CrudPage from "../_crud/CrudPage";
import GateStatus from "../_crud/GateStatus";

export const metadata: Metadata = { title: "Whitelisted e-mails" };
export const dynamic = "force-dynamic";

export default async function WhitelistPage({ searchParams }: PageProps<"/whitelist">) {
  return (
    <CrudPage resource="whitelist" searchParams={await searchParams}>
      <GateStatus />
    </CrudPage>
  );
}
