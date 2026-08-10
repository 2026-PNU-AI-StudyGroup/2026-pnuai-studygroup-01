import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramReportRequirementForm } from "@/app/admin/programs/_components/program-report-requirement-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FormSection } from "@/shared/ui/form-system";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramReportRequirementsPage({ params }: { params: Promise<{ programId: string }> }) {
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
  const teamCount = await prisma.team.count({ where: { programId: program.id, status: { not: "CLOSED" } } });

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/reports`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="이 프로그램의 모든 팀에 제출할 보고서와 마감을 일괄 지정합니다."
        actions={<Link href={`/admin/programs/${program.id}/settings`} className="button-secondary"><UiText>{"설정으로"}</UiText></Link>}
      >
        <FormSection title="제출물 요건" description="체크한 보고서를 프로그램의 모든 팀에 요구로 지정하고 마감을 설정합니다. 팀별 화면에서 개별 조정도 가능합니다.">
          <ProgramReportRequirementForm programId={program.id} teamCount={teamCount} />
        </FormSection>
      </AdminWorkspace>
    </AppShell>
  );
}
