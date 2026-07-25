import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserStatusForm } from "@/app/admin/users/_components/user-status-form";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { UserAdministrationService } from "@/modules/identity/application/manage-users";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "사용자 관리" };

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자" } as const;
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ q?: SearchParamValue; page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new UserAdministrationService(new PrismaUserAdministrationRepository(prisma)).list(actor, query, requestedPage);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/users">
      <AdminWorkspace currentPath="/admin/users" title="사용자" description="가입한 구성원의 역할과 계정 상태를 확인하고, 접근 중단이 필요한 계정의 세션까지 종료합니다.">
        <form role="search" className="grid gap-3 border-y border-[var(--line)] py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid gap-2 text-sm font-semibold">이름 또는 이메일 검색<input className="field" type="search" name="q" maxLength={100} defaultValue={query} placeholder="예: 홍길동 또는 user@pusan.ac.kr" /></label>
          <button type="submit" className="button-primary self-end max-sm:w-full">검색</button>
        </form>
        <section aria-labelledby="user-list-title">
          <div className="mb-4 flex items-center justify-between gap-4"><h2 id="user-list-title" className="text-lg font-semibold">가입 사용자</h2><p className="muted text-sm">총 {data.total}명</p></div>
          {data.items.length === 0 ? <EmptyState title="조건에 맞는 사용자가 없습니다" description="검색어를 지우거나 이름과 이메일 철자를 확인해 주세요." action={query ? <Link href="/admin/users" className="button-secondary">검색 초기화</Link> : undefined} /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white">{data.items.map((user) => <li key={user.id} className="record-row grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_12rem_13rem] lg:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">{user.name}</h3><StatusBadge>{roleLabel[user.role]}</StatusBadge><StatusBadge tone={user.isActive ? "neutral" : "danger"}>{user.isActive ? "활성" : "비활성"}</StatusBadge></div><p className="muted mt-2 break-all text-sm">{user.email}</p></div>
            <dl className="grid grid-cols-[5rem_1fr] gap-1 text-sm lg:block"><dt className="muted lg:text-xs">가입일</dt><dd className="lg:mt-1">{date.format(user.createdAt)}</dd></dl>
            <UserStatusForm userId={user.id} name={user.name} isActive={user.isActive} disabled={user.id === actor.id} />
          </li>)}</ol>}
        </section>
        {data.totalPages > 1 ? <nav aria-label="사용자 목록 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={`/admin/users?q=${encodeURIComponent(query)}&page=${data.page - 1}`}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={`/admin/users?q=${encodeURIComponent(query)}&page=${data.page + 1}`}>다음</Link> : null}</div></nav> : null}
      </AdminWorkspace>
    </AppShell>
  );
}
