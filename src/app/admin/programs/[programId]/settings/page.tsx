import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramIconForm } from "@/app/admin/programs/_components/program-icon-picker";
import { ProgramPolicyForm } from "@/app/admin/programs/_components/program-policy-form";
import { ProgramStatusForm } from "@/app/admin/programs/_components/program-status-form";
import { StudentProjectCreationForm } from "@/app/admin/programs/_components/student-project-creation-form";
import { ProgramVoteResults } from "@/app/admin/programs/_components/program-vote-results";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiAside } from "@/modules/translation/ui/localized-elements";
import { FormSection } from "@/shared/ui/form-system";
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
  const refreshed = new Date();
  const votingResults = program.votingPolicy
    ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshed).getResults(actor, program.id)
    : null;

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
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="grid gap-4">
              <ProgramPolicyForm
                programId={program.id}
                registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
                registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
                recruitmentEndsAt={program.recruitmentEndsAt}
                votingPolicy={program.votingPolicy ?? null}
              />
              {votingResults ? (
                <FormSection title="득표현황" description="투표 설정을 조정한 뒤 같은 화면에서 현재 집계와 최종 결과를 확인합니다.">
                  <ProgramVoteResults results={votingResults} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshed)} />
                </FormSection>
              ) : null}
            </div>
            <UiAside aria-label="보조 운영 설정" className="grid gap-4">
              <StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} disabled={program.status === "CLOSED"} />
              <ProgramIconForm id={program.id} icon={program.icon} />
            </UiAside>
          </div>
          <ProgramStatusForm id={program.id} status={program.status} />
        </div>
      </AdminWorkspace>
    </AppShell>
  );
}
