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
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary)] px-3 text-xs font-bold text-white transition-colors hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]"
      href={href ?? `/topics?programId=${encodeURIComponent(program.id)}&modal=project-proposal`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2">
        <path d="M10 4v12M4 10h12" strokeLinecap="round" />
      </svg>
      <UiText>{"프로젝트 등록"}</UiText>
    </Link>
  );
}
