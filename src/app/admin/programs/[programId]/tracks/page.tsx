import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

  const tracks = await prisma.programTrack.findMany({
    where: { programId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, _count: { select: { topics: true } } },
  });
  const rows: TrackRow[] = tracks.map((track) => ({ id: track.id, name: track.name, topicCount: track._count.topics }));

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/admin/programs/${program.id}/tracks`}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="세부 트랙(소분류)을 정의합니다. 해커톤의 창업·융합 트랙처럼 주제를 나누는 데 사용합니다."
        actions={<Link href={`/admin/programs/${program.id}/settings`} className="button-secondary"><UiText>{"설정으로"}</UiText></Link>}
      >
        <FormSection title="트랙(소분류)" description="관리자가 대분류(프로그램) 아래 세부 트랙을 만들면, 주제를 트랙별로 나눌 수 있습니다.">
          <TrackManager programId={program.id} tracks={rows} />
        </FormSection>
      </AdminWorkspace>
    </AppShell>
  );
}
