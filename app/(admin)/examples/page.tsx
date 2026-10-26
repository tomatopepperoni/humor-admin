import type { Metadata } from "next";
import CrudPage from "../_crud/CrudPage";

export const metadata: Metadata = { title: "AI generation examples" };
export const dynamic = "force-dynamic";

export default async function ExamplesPage({ searchParams }: PageProps<"/examples">) {
  return <CrudPage resource="examples" searchParams={await searchParams} />;
}
