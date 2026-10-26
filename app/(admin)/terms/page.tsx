import type { Metadata } from "next";
import CrudPage from "../_crud/CrudPage";

export const metadata: Metadata = { title: "Terms" };
export const dynamic = "force-dynamic";

export default async function TermsPage({ searchParams }: PageProps<"/terms">) {
  return <CrudPage resource="terms" searchParams={await searchParams} />;
}
