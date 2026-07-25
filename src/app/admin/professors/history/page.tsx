import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "교수 권한 변경 이력" };

const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export default async function ProfessorHistoryPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const entries = await new ProfessorAccessService(
    new PrismaProfessorAccessRepository(prisma),
  ).listAudit(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors/history">
      <AdminWorkspace currentPath="/admin/professors/history" eyebrow="교수 권한 · 변경 이력" title="교수 권한 변경 이력" description="권한을 허용하거나 회수한 기록과 처리자를 시간순으로 살펴봅니다." actions={<Link className="button-secondary" href="/admin/professors">권한 목록</Link>}>
        <section aria-labelledby="professor-audit-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="professor-audit-title" className="text-lg font-semibold">최근 권한 변경 기록</h2><span className="muted text-sm">최근 {entries.length}건</span></div>
          {entries.length === 0 ? <div className="mt-6"><EmptyState title="아직 권한 변경 기록이 없습니다" description="권한을 바꾸면 기록이 자동으로 남습니다." action={<Link className="button-secondary" href="/admin/professors/new">교수 이메일 추가</Link>} /></div> : <ol className="divide-y divide-[var(--line)]">{entries.map((entry) => <li key={entry.id} className="grid gap-3 py-5 text-sm md:grid-cols-[minmax(0,1fr)_10rem_12rem] md:items-center"><div><strong className="font-semibold">{entry.targetEmail}</strong><p className="muted mt-1 text-xs">{entry.action === "PROFESSOR_ACCESS_GRANTED" ? "교수 권한 허용" : "교수 권한 회수"}</p></div><dl className="grid grid-cols-[5rem_1fr] gap-1 md:block"><dt className="muted text-xs">처리자</dt><dd className="md:mt-1">{entry.actorName}</dd></dl><time className="muted text-xs md:text-right" dateTime={entry.createdAt.toISOString()}>{koreanDateTime.format(entry.createdAt)}</time></li>)}</ol>}
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}
