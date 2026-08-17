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
import { UserRoleForm } from "@/app/admin/users/_components/user-role-form";
import { UserStatusForm } from "@/app/admin/users/_components/user-status-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import {
  USER_LIST_ROLE_FILTERS,
  USER_LIST_STATUS_FILTERS,
  UserAdministrationService,
  resolveUserListRoleFilter,
  resolveUserListStatusFilter,
  type UserListRoleFilter,
  type UserListStatusFilter,
} from "@/modules/identity/application/manage-users";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { SearchIcon, UndoIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사용자 관리");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자", ADVISOR: "자문위원" } as const;

const roleFilterLabel: Record<UserListRoleFilter, string> = {
  ALL: "전체",
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
  ADVISOR: "자문위원",
};

const statusFilterLabel: Record<UserListStatusFilter, string> = {
  ALL: "전체",
  ACTIVE: "활성",
  INACTIVE: "비활성",
};

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ q?: SearchParamValue; page?: SearchParamValue; role?: SearchParamValue; status?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const roleFilter = resolveUserListRoleFilter(firstSearchParam(params.role));
  const statusFilter = resolveUserListStatusFilter(firstSearchParam(params.status));
  const data = await new UserAdministrationService(new PrismaUserAdministrationRepository(prisma)).list(actor, query, requestedPage, { role: roleFilter, status: statusFilter });
  const filtered = roleFilter !== "ALL" || statusFilter !== "ALL";
  // 필터를 바꾸면 결과 수가 달라지므로 페이지는 항상 처음으로 되돌린다.
  const listHref = (next: { role?: UserListRoleFilter; status?: UserListStatusFilter; page?: number }) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    const role = next.role ?? roleFilter;
    const status = next.status ?? statusFilter;
    if (role !== "ALL") search.set("role", role);
    if (status !== "ALL") search.set("status", status);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const queryString = search.toString();
    return queryString ? `/admin/users?${queryString}` : "/admin/users";
  };

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/users">
      <AdminWorkspace currentPath="/admin/users" title="사용자" description="가입한 구성원의 역할과 계정 상태를 확인하고, 필요한 경우 계정을 비활성화해 로그인 상태를 종료합니다.">
        <form role="search" className="admin-panel grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"이름 또는 이메일 검색"}</UiText><UiInput className="form-control" type="search" name="q" maxLength={100} defaultValue={query} placeholder="예: 홍길동 또는 user@pusan.ac.kr" /></label>
          <button type="submit" className="button-primary gap-2 max-sm:w-full"><SearchIcon className="size-4 shrink-0" /><UiText>{"검색"}</UiText></button>
          {roleFilter !== "ALL" ? <input type="hidden" name="role" value={roleFilter} /> : null}
          {statusFilter !== "ALL" ? <input type="hidden" name="status" value={statusFilter} /> : null}
        </form>
        <div className="grid gap-3">
          <UiNav aria-label="역할 필터" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{"역할"}</UiText></span>
            {USER_LIST_ROLE_FILTERS.map((filter) => {
              const selected = filter === roleFilter;
              return (
                <Link
                  key={filter}
                  href={listHref({ role: filter })}
                  aria-current={selected ? "page" : undefined}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold leading-9 ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}
                >
                  <UiText>{roleFilterLabel[filter]}</UiText>
                </Link>
              );
            })}
          </UiNav>
          <UiNav aria-label="계정 상태 필터" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{"상태"}</UiText></span>
            {USER_LIST_STATUS_FILTERS.map((filter) => {
              const selected = filter === statusFilter;
              return (
                <Link
                  key={filter}
                  href={listHref({ status: filter })}
                  aria-current={selected ? "page" : undefined}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold leading-9 ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}
                >
                  <UiText>{statusFilterLabel[filter]}</UiText>
                </Link>
              );
            })}
          </UiNav>
        </div>
        <AdminSection
          id="user-list-title"
          title="가입 사용자"
          meta={<><UiText>{"총"}</UiText>{" "}{data.total}<UiText>{"명"}</UiText></>}
        >
          {data.items.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="section" title={query || filtered ? "조건에 맞는 사용자가 없습니다" : "아직 가입한 사용자가 없습니다"} description={query || filtered ? "검색어나 필터를 지우고 다시 확인해 주세요." : "사용자가 처음 로그인하면 이 목록에 표시됩니다."} action={query || filtered ? <Link href="/admin/users" className="button-secondary gap-2"><UndoIcon className="size-4 shrink-0" /><UiText>{"검색 초기화"}</UiText></Link> : undefined} />
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
                      <div className="grid gap-2">
                        <UserStatusForm userId={user.id} name={user.name} isActive={user.isActive} activeResponsibilityCount={user.activeResponsibilityCount} />
                        {user.isActive ? <UserRoleForm userId={user.id} name={user.name} role={user.role} isSelf={false} /> : null}
                      </div>
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
                {data.page > 1 ? <PaginationDirectionLink direction="previous" href={listHref({ page: data.page - 1 })} /> : null}
                {data.page < data.totalPages ? <PaginationDirectionLink direction="next" href={listHref({ page: data.page + 1 })} /> : null}
              </div>
            </UiNav>
          ) : null}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
