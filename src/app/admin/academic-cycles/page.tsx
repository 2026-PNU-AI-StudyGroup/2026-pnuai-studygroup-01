import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "학기 관리" };

export default async function AcademicCyclesPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const repository = new PrismaAcademicCycleRepository(prisma);
  const cycles = await new ListAcademicCyclesService(repository).execute();
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/academic-cycles">
      <AdminWorkspace currentPath="/admin/academic-cycles" title="운영 학기" description="모든 프로그램이 공유할 학년도와 학기 기준을 설정합니다." actions={<Link className="button-primary" href="/admin/academic-cycles/new">새 학기</Link>}>
        <section aria-labelledby="cycle-list-title"><div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="cycle-list-title" className="text-lg font-bold">학기 목록</h2><span className="muted text-sm">총 {cycles.length}개</span></div>{cycles.length === 0 ? <div className="mt-6"><EmptyState title="아직 설정한 학기가 없습니다" description="첫 운영 학기를 정하면 프로그램을 만들 수 있습니다." action={<Link className="button-secondary" href="/admin/academic-cycles/new">첫 학기 설정</Link>} /></div> : <ol className="divide-y divide-[var(--line)]">{cycles.map((cycle) => <li key={cycle.id} className="flex items-center justify-between gap-4 py-5"><span className="font-bold">{cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기</span><StatusBadge>운영 기준</StatusBadge></li>)}</ol>}</section>
      </AdminWorkspace>
    </AppShell>
  );
}
