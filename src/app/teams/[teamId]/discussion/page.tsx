import { redirectLegacyProjectTeamRoute } from "@/modules/team/infrastructure/legacy-project-route";

export default async function LegacyPage({ params }: {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectLegacyProjectTeamRoute((await params).teamId, "/discussion");
}
