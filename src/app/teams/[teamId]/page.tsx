import { redirectLegacyProjectTeamRoute } from "@/modules/team/infrastructure/legacy-project-route";

export default async function LegacyProjectTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  return redirectLegacyProjectTeamRoute((await params).teamId);
}
