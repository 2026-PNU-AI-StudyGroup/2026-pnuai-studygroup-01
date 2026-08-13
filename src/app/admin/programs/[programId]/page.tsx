import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

const legacyTabs = new Set(["overview", "settings", "rubric", "tracks", "reports", "votes"]);

export default async function ProgramDetailPage({ params, searchParams }: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;
  const requestedTab = (await searchParams).tab;
  const tab = requestedTab && legacyTabs.has(requestedTab) ? requestedTab : "settings";
  redirect(`/topics?programId=${encodeURIComponent(programId)}&mode=manage&tab=${tab}`);
}
