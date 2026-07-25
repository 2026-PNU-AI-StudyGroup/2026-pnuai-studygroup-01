import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RevokeProfessorAccessForm } from "@/app/admin/professors/_components/revoke-professor-access-form";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

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
      <AdminWorkspace currentPath="/admin/professors" title="교수 권한" description="교수 기능을 사용할 부산대학교 이메일을 승인하고, 더 이상 필요하지 않은 접근 권한을 회수합니다." actions={<><Link className="button-primary" href="/admin/professors/new">교수 이메일 등록</Link><Link className="button-secondary" href="/admin/professors/history">변경 이력</Link></>}>
        <section aria-labelledby="professor-list-title">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="professor-list-title" className="text-lg font-semibold">교수 권한 목록</h2><span className="muted text-sm">총 {entries.length}개</span></div>
          {entries.length === 0 ? <div className="mt-6"><EmptyState title="등록된 교수 이메일이 없습니다" description="교수 계정이 로그인하기 전에 이메일을 등록하세요." action={<Link className="button-secondary" href="/admin/professors/new">첫 교수 이메일 등록</Link>} /></div> : <ol className="divide-y divide-[var(--line)]">{entries.map((entry) => <li key={entry.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_11rem_10rem_auto] lg:items-center"><div><p className="font-semibold">{entry.email}</p><p className="muted mt-1 text-xs">{entry.account?.name ?? "로그인 전"}</p></div><dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block"><dt className="muted lg:text-xs">계정 역할</dt><dd className="lg:mt-1">{entry.account ? entry.account.role === "ADMIN" ? "관리자" : entry.account.role === "PROFESSOR" ? "교수" : "학생" : "미연결"}</dd></dl><dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block"><dt className="muted lg:text-xs">최초 등록</dt><dd className="lg:mt-1">{koreanDate.format(entry.createdAt)}</dd></dl><div className="flex items-center gap-3 lg:justify-end">{entry.revokedAt ? <StatusBadge tone="neutral">{koreanDate.format(entry.revokedAt)} 회수</StatusBadge> : <><StatusBadge>허용</StatusBadge><RevokeProfessorAccessForm email={entry.email} /></>}</div></li>)}</ol>}
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}
