import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramPolicyForm } from "@/app/admin/programs/_components/program-policy-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramSettingsPage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;
  let program;
  try {
    program = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).getSettings(actor, programId);
  } catch {
    notFound();
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/settings`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        title={`${program.name} 설정`}
        description="프로젝트 등록 기간과 프로그램별 투표 정책을 설정합니다."
        actions={<Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link>}
      >
        <ProgramPolicyForm
          programId={program.id}
          registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
          registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
          votingPolicy={program.votingPolicy ?? null}
        />
      </AdminWorkspace>
    </AppShell>
  );
}
