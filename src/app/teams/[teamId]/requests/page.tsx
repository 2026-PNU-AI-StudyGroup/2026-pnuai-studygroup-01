import { redirectLegacyProjectTeamRoute } from "@/modules/team/infrastructure/legacy-project-route";

export default async function LegacyPage({ params }: { params: Promise<{ teamId: string }> }) {
  return redirectLegacyProjectTeamRoute((await params).teamId, "/requests");
}
