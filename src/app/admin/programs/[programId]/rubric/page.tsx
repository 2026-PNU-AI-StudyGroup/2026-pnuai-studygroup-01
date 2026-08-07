import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RubricManager, type CriterionRow } from "@/app/admin/programs/[programId]/rubric/_components/rubric-manager";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FormSection } from "@/shared/ui/form-system";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramRubricPage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;

  const program = await prisma.projectProgram.findUnique({ where: { id: programId }, select: { id: true, name: true } });
  if (!program) notFound();

  const criteria = await prisma.rubricCriterion.findMany({
    where: { programId },
    orderBy: { position: "asc" },
    select: { id: true, label: true, maxPoints: true },
  });
  const rows: CriterionRow[] = criteria.map((criterion) => ({ id: criterion.id, label: criterion.label, maxPoints: criterion.maxPoints }));

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/rubric`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="보고서를 항목별로 채점할 채점표(루브릭)를 정의합니다. 지도교수·관리자가 이 항목으로 점수를 매깁니다."
        actions={<Link href={`/admin/programs/${program.id}/settings`} className="button-secondary"><UiText>{"설정으로"}</UiText></Link>}
      >
        <FormSection title="채점표(루브릭)" description="항목과 배점을 정하면, 보고서 화면에서 항목별 점수를 입력하고 합산 결과를 학생에게 공개할 수 있습니다.">
          <RubricManager programId={program.id} criteria={rows} />
        </FormSection>
      </AdminWorkspace>
    </AppShell>
  );
}
