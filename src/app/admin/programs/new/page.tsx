import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProgramForm } from "@/app/admin/programs/program-forms";
import { AdminWorkspace } from "@/app/admin/admin-workspace";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "새 프로그램 등록" };

export default async function NewProgramPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const cycles = await new ListAcademicCyclesService(new PrismaAcademicCycleRepository(prisma)).execute();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/programs/new">
      <AdminWorkspace currentPath="/admin/programs/new" eyebrow="프로그램 · 새 등록" title="새 프로젝트 프로그램" description="학기와 운영 기간을 연결하고 학생과 교수가 사용할 프로그램을 초안으로 등록합니다." actions={<Link className="button-secondary" href="/admin/programs">등록 취소</Link>}>
        {cycles.length ? <ProgramForm cycles={cycles} successHref="/admin/programs" /> : <EmptyState title="등록된 학기가 없습니다" description="프로그램을 만들기 전에 운영 학기를 등록해 주세요." action={<Link className="button-secondary" href="/admin/academic-cycles">학기 등록</Link>} />}
      </AdminWorkspace>
    </AppShell>
  );
}
