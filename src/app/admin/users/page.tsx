import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiInput, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
  adminRecordRowClassName,
} from "@/app/_components/admin-section";
import { UserStatusForm } from "@/app/admin/users/_components/user-status-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { UserAdministrationService } from "@/modules/identity/application/manage-users";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사용자 관리");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자" } as const;

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
      <AdminWorkspace currentPath="/admin/users" title="사용자" description="가입한 구성원의 역할과 계정 상태를 확인하고, 필요한 경우 계정을 비활성화해 로그인 상태를 종료합니다.">
        <form role="search" className="admin-panel grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"이름 또는 이메일 검색"}</UiText><UiInput className="form-control" type="search" name="q" maxLength={100} defaultValue={query} placeholder="예: 홍길동 또는 user@pusan.ac.kr" /></label>
          <button type="submit" className="button-primary max-sm:w-full"><UiText>{"검색"}</UiText></button>
        </form>
        <AdminSection
          id="user-list-title"
          title="가입 사용자"
          meta={<><UiText>{"총"}</UiText>{" "}{data.total}<UiText>{"명"}</UiText></>}
        >
          {data.items.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="embedded" title="조건에 맞는 사용자가 없습니다" description="검색어를 지우거나 이름과 이메일 철자를 확인해 주세요." action={query ? <Link href="/admin/users" className="button-secondary"><UiText>{"검색 초기화"}</UiText></Link> : undefined} />
            </AdminSectionEmpty>
          ) : (
            <ol className={adminRecordListClassName}>
              {data.items.map((user) => (
                <li
                  key={user.id}
                  className={`${adminRecordRowClassName} grid gap-5 xl:grid-cols-[minmax(18rem,1fr)_minmax(9rem,11rem)_minmax(10rem,13rem)] xl:items-center`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">{user.name}</h3>
                      <StatusBadge>{roleLabel[user.role]}</StatusBadge>
                      <StatusBadge tone={user.isActive ? "neutral" : "danger"}><UiText>{user.isActive ? "활성" : "비활성"}</UiText></StatusBadge>
                    </div>
                    <p className="muted mt-2 break-words text-sm">{user.email}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end xl:contents">
                    <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-1 text-sm xl:block">
                      <dt className="muted xl:text-xs"><UiText>{"가입일"}</UiText></dt>
                      <dd className="xl:mt-1"><UiDate value={user.createdAt} mode="date" /></dd>
                    </dl>
                    {user.id === actor.id ? (
                      <div className="sm:text-right"><StatusBadge tone="info"><UiText>{"내 계정"}</UiText></StatusBadge></div>
                    ) : (
                      <UserStatusForm userId={user.id} name={user.name} isActive={user.isActive} activeResponsibilityCount={user.activeResponsibilityCount} />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {data.totalPages > 1 ? (
            <UiNav aria-label="사용자 목록 페이지" className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
              <span className="muted text-sm">{data.page} / {data.totalPages} {" "}<UiText>{"페이지"}</UiText></span>
              <div className="flex gap-2">
                {data.page > 1 ? <PaginationDirectionLink direction="previous" href={`/admin/users?q=${encodeURIComponent(query)}&page=${data.page - 1}`} /> : null}
                {data.page < data.totalPages ? <PaginationDirectionLink direction="next" href={`/admin/users?q=${encodeURIComponent(query)}&page=${data.page + 1}`} /> : null}
              </div>
            </UiNav>
          ) : null}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
