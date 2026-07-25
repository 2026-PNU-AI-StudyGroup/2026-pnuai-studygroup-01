import { redirect } from "next/navigation";

export default function StudentTeamInvitationsPage() {
  redirect("/teams?modal=invitations");
}
