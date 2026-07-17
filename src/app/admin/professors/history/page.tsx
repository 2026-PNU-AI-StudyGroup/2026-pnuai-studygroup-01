import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

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
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="감사 기록" title="교수 권한 변경 이력" description="교수 권한을 허용하거나 회수한 기록과 처리자를 시간순으로 확인합니다." actions={<Link className="button-quiet" href="/admin/professors">교수 권한 목록으로</Link>} />
        <section aria-labelledby="professor-audit-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="professor-audit-title" className="text-lg font-bold">최근 권한 변경 기록</h2><span className="muted text-sm">최근 {entries.length}건</span></div>
          {entries.length === 0 ? <div className="mt-6"><EmptyState title="권한 변경 기록이 없습니다" description="교수 이메일을 허용하거나 권한을 회수하면 이곳에 기록됩니다." action={<Link className="button-secondary" href="/admin/professors/new">교수 이메일 등록</Link>} /></div> : <ol className="divide-y divide-[var(--line)]">{entries.map((entry) => <li key={entry.id} className="grid gap-2 py-5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><strong>{entry.targetEmail}</strong><p className="muted mt-1 text-xs">처리자 {entry.actorName} · {entry.action === "PROFESSOR_ACCESS_GRANTED" ? "교수 권한 허용" : "교수 권한 회수"}</p></div><time className="muted text-xs" dateTime={entry.createdAt.toISOString()}>{koreanDateTime.format(entry.createdAt)}</time></li>)}</ol>}
        </section>
      </main>
    </AppShell>
  );
}
