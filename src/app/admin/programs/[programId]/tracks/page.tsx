import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramManagementNav } from "@/app/admin/programs/_components/program-management-nav";
import { TrackManager, type TrackRow } from "@/app/admin/programs/[programId]/tracks/_components/track-manager";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FormSection } from "@/shared/ui/form-system";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProgramTracksPage({ params }: { params: Promise<{ programId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;

  const program = await prisma.projectProgram.findUnique({ where: { id: programId }, select: { id: true, name: true } });
  if (!program) notFound();

  const tracks = await prisma.programDivision.findMany({
    where: { programId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, _count: { select: { topics: true } } },
  });
  const rows: TrackRow[] = tracks.map((track) => ({ id: track.id, name: track.name, projectCount: track._count.topics }));

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/tracks`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="프로그램 내부 분과를 정의하고 프로젝트의 소속을 관리합니다."
        actions={<Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link>}
      >
        <ProgramManagementNav programId={program.id} current="divisions" />
        <FormSection title="분과" description="분과가 하나 이상이면 새 프로젝트는 반드시 하나의 분과를 선택합니다.">
          <TrackManager programId={program.id} tracks={rows} />
        </FormSection>
      </AdminWorkspace>
    </AppShell>
  );
}
