import Link from "next/link";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";
import { UiText } from "@/modules/translation/ui/i18n-provider";

type RegistrableProgram = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  projectRegistrationStartsAt?: Date;
  projectRegistrationEndsAt?: Date;
  studentProjectCreationEnabled: boolean;
};

export function StudentProjectRegistrationLink({ role, program, now }: {
  role: UserRole;
  program?: RegistrableProgram;
  now: Date;
}) {
  if (
    role !== "STUDENT" ||
    !program?.studentProjectCreationEnabled ||
    !isProjectRegistrationOpen(program, now)
  ) return null;

  return (
    <Link className="button-primary" href={`/projects/new?programId=${encodeURIComponent(program.id)}`}>
      <UiText>{"프로젝트 등록"}</UiText>
    </Link>
  );
}
