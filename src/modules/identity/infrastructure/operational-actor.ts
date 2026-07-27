import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { requireCompletedStudentOnboarding } from "@/modules/identity/infrastructure/student-onboarding-guard";

export async function getCurrentOperationalActor() {
  const actor = await getCurrentActor();
  return actor ? requireCompletedStudentOnboarding(actor) : null;
}
