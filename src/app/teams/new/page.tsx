import { redirect } from "next/navigation";

export default function NewStudentTeamPage() {
  redirect("/teams?modal=create");
}
