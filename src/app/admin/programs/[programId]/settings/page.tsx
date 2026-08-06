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
        title={`${program.name} 관리`}
        description="프로그램 운영, 학생 제안, 등록·투표 정책과 득표현황을 한 곳에서 관리합니다."
        actions={<Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link>}
      >
        <div className="grid gap-4">
          <ProgramStatusForm id={program.id} status={program.status} />
          <StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} disabled={program.status === "CLOSED"} />
          <ProgramIconForm id={program.id} icon={program.icon} />
          <ProgramPolicyForm
            programId={program.id}
            registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
            registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
            votingPolicy={program.votingPolicy ?? null}
          />
          {votingResults ? (
            <FormSection title="득표현황" description="투표 설정과 같은 화면에서 현재 집계와 최종 결과를 확인합니다.">
              <ProgramVoteResults results={votingResults} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshed)} />
            </FormSection>
          ) : null}
        </div>
      </AdminWorkspace>
    </AppShell>
  );
}
