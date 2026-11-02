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

export function StudentProjectRegistrationLink({ role, program, now, href }: {
  role: UserRole;
  program?: RegistrableProgram;
  now: Date;
  href?: string;
}) {
  if (
    role !== "STUDENT" ||
    !program?.studentProjectCreationEnabled ||
    !isProjectRegistrationOpen(program, now)
  ) return null;

  return (
    <Link
      className="button-primary button-compact shrink-0 gap-1.5"
      href={href ?? `/topics?programId=${encodeURIComponent(program.id)}&modal=project-registration`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2">
        <path d="M10 4v12M4 10h12" strokeLinecap="round" />
      </svg>
      <UiText>{"프로젝트 등록"}</UiText>
    </Link>
  );
}
