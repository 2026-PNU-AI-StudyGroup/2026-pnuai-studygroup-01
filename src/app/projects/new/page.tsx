import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { redirect } from "next/navigation";

export default async function NewStudentProjectPage({ searchParams }: {
  searchParams: Promise<{ programId?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/professor/topics/new");

  const programId = firstSearchParam((await searchParams).programId)?.trim();
  const target = new URLSearchParams({ modal: "project-registration" });
  if (programId) target.set("programId", programId.slice(0, 200));
  redirect(`/topics?${target.toString()}`);
}
