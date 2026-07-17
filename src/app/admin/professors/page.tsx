import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RevokeProfessorAccessForm } from "@/app/admin/professors/revoke-professor-access-form";
import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "교수 권한 관리" };

const koreanDate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export default async function ProfessorsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const service = new ProfessorAccessService(
    new PrismaProfessorAccessRepository(prisma),
  );
  const entries = await service.list(actor);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="운영 관리" title="교수 권한 관리" description="사전 등록된 부산대학교 이메일만 교수 기능을 사용할 수 있습니다." actions={<div className="flex flex-wrap gap-2"><Link className="button-primary" href="/admin/professors/new">교수 이메일 등록</Link><Link className="button-secondary" href="/admin/professors/history">변경 이력</Link></div>} />
        <section aria-labelledby="professor-list-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="professor-list-title" className="text-lg font-bold">교수 권한 목록</h2><span className="muted text-sm">총 {entries.length}개</span></div>
          {entries.length === 0 ? <div className="mt-6"><EmptyState title="등록된 교수 이메일이 없습니다" description="교수 계정이 로그인하기 전에 이메일을 등록하세요." action={<Link className="button-secondary" href="/admin/professors/new">첫 교수 이메일 등록</Link>} /></div> : <ol className="divide-y divide-[var(--line)]">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><p className="font-bold">{entry.email}</p><p className="muted mt-1 text-xs">{entry.account ? `${entry.account.name} · ${entry.account.role === "ADMIN" ? "관리자" : entry.account.role === "PROFESSOR" ? "교수" : "학생"}` : "로그인 전"} · 최초 등록 {koreanDate.format(entry.createdAt)}</p></div><div className="flex items-center gap-3">{entry.revokedAt ? <StatusBadge tone="neutral">{koreanDate.format(entry.revokedAt)} 회수</StatusBadge> : <><StatusBadge>허용</StatusBadge><RevokeProfessorAccessForm email={entry.email} /></>}</div></li>)}</ol>}
        </section>
      </main>
    </AppShell>
  );
}
