import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProgramForm } from "@/app/admin/programs/_components/program-form";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "새 프로그램 등록" };

export default async function NewProgramPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const cycles = await new ListAcademicCyclesService(new PrismaAcademicCycleRepository(prisma)).execute();

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/programs/new">
      <AdminWorkspace currentPath="/admin/programs/new" eyebrow="프로그램 · 새로 만들기" title="새 프로그램" description="운영 학기와 기간을 정해 프로젝트가 시작될 무대를 만듭니다." actions={<Link className="button-secondary" href="/admin/programs">프로그램 목록</Link>}>
        {cycles.length ? <ProgramForm cycles={cycles} successHref="/admin/programs" /> : <EmptyState title="설정된 학기가 없습니다" description="프로그램보다 먼저 운영 학기를 설정해 주세요." action={<Link className="button-secondary" href="/admin/academic-cycles">학기 설정</Link>} />}
      </AdminWorkspace>
    </AppShell>
  );
}
