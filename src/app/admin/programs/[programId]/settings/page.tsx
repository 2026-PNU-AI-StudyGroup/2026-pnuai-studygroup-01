import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramIconForm } from "@/app/admin/programs/_components/program-icon-picker";
import { ProgramManagementNav } from "@/app/admin/programs/_components/program-management-nav";
import { ProgramPolicyForm } from "@/app/admin/programs/_components/program-policy-form";
import { ProgramStatusForm } from "@/app/admin/programs/_components/program-status-form";
import { StudentProjectCreationForm } from "@/app/admin/programs/_components/student-project-creation-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiAside } from "@/modules/translation/ui/localized-elements";
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
        eyebrow="프로그램 관리"
        title={program.name}
        description="등록과 투표 정책을 정하고, 학생 제안과 공개 상태를 운영합니다."
        actions={<Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link>}
      >
        <div className="grid gap-4">
          <ProgramManagementNav programId={program.id} current="settings" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="grid gap-4">
              <ProgramPolicyForm
                programId={program.id}
                name={program.name}
                category={program.category}
                description={program.description}
                startsAt={program.startsAt}
                endsAt={program.endsAt}
                advisorEnabled={program.advisorEnabled}
                registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
                registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
                recruitmentEndsAt={program.recruitmentEndsAt}
                votingPolicy={program.votingPolicy ?? null}
                divisionCount={program.divisions?.length ?? 0}
              />
            </div>
            <UiAside aria-label="보조 운영 설정" className="grid gap-4">
              <StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} disabled={program.lifecycleStatus === "CLOSED"} />
              <ProgramIconForm id={program.id} icon={program.icon} />
            </UiAside>
          </div>
          <ProgramStatusForm id={program.id} isPublic={program.isPublic === true} lifecycleStatus={program.lifecycleStatus ?? (program.status === "CLOSED" ? "CLOSED" : "ACTIVE")} />
        </div>
      </AdminWorkspace>
    </AppShell>
  );
}
